import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import type { MemberConsent } from '@/generated/prisma/client';
import { SaveOnboardingRequestDto } from './dto/save-onboarding-request.dto';
import { UpdateMeRequestDto } from './dto/update-me-request.dto';
import { UpdateSensitiveInfoConsentRequestDto } from './dto/update-sensitive-info-consent-request.dto';
import { UpdateNotificationSettingsRequestDto } from './dto/update-notification-settings-request.dto';
import type {
  AlarmFlag,
  NotificationSettingsResponseDto,
} from './dto/notification-settings-response.dto';
import { DeleteMeRequestDto } from './dto/delete-me-request.dto';
import { UserErrorCode } from './user-error-code.enum';
import { ProfileImageFile, ProfileImageService } from './profile-image.service';

interface MemberResponseSource {
  id: bigint;
  email: string | null;
  nickname: string | null;
  profileImg: string | null;
  profileImageKey: string | null;
  gender: string | null;
  ageGroup: number | null;
  baselineType: string | null;
  sensInfo: string;
  status: string;
  regDate?: Date;
}

interface SocialAccountResponseSource {
  provider: string;
  email: string | null;
  regDate: Date;
}

interface MemberConsentResponseSource {
  agreed: boolean;
}

interface MemberWithSocialAccountsResponseSource extends MemberResponseSource {
  socialAccounts?: SocialAccountResponseSource[];
  memberConsents?: MemberConsentResponseSource[];
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileImages: ProfileImageService,
  ) {}

  async saveOnboarding(
    userId: string,
    dto: SaveOnboardingRequestDto,
    profileImage?: ProfileImageFile,
  ) {
    this.assertNickname(dto.nickname);

    const member = await this.findActiveMemberOrThrow(userId);
    await this.assertNicknameAvailable(dto.nickname, member.id);

    if (this.isOnboardingCompleted(member)) {
      throw new BusinessException(
        UserErrorCode.ONBOARDING_ALREADY_COMPLETED,
        '이미 온보딩을 완료한 사용자입니다.',
        HttpStatus.CONFLICT,
      );
    }

    const sensitiveInfoAvailable = this.isSensitiveInfoAvailable(dto.gender);
    this.assertOnboardingSensitiveInfo(dto, sensitiveInfoAvailable);
    const sensitiveInfoAgreed = sensitiveInfoAvailable
      ? (dto.sensitiveInfoAgreed as boolean)
      : false;
    const storedProfileImageKey = profileImage
      ? await this.profileImages.save(userId, profileImage)
      : undefined;
    const onboardingData: {
      nickname: string;
      profileImageKey?: string | null;
      gender: string;
      ageGroup: number;
      baselineType: string;
      sensInfo: string;
    } = {
      nickname: dto.nickname,
      gender: dto.gender,
      ageGroup: dto.ageGroup,
      baselineType: dto.baselineType,
      sensInfo: sensitiveInfoAgreed ? 'Y' : 'F',
    };

    if (storedProfileImageKey !== undefined) {
      onboardingData.profileImageKey = storedProfileImageKey;
    }

    let updatedMember: MemberResponseSource;
    try {
      updatedMember = await this.prisma.$transaction(async (tx) => {
        const savedMember = await tx.member.update({
          where: { id: member.id },
          data: onboardingData,
        });

        if (sensitiveInfoAvailable) {
          await tx.memberConsent.create({
            data: {
              userId: member.id,
              consentType: 'SENSITIVE',
              agreed: sensitiveInfoAgreed,
              policyVersion: dto.sensitiveInfoPolicyVersion as string,
              agreedAt: sensitiveInfoAgreed ? new Date() : null,
            },
          });
        }

        return savedMember;
      });
    } catch (error) {
      await this.profileImages.deleteBestEffort(storedProfileImageKey);
      this.rethrowNicknameConflict(error);
      throw error;
    }

    if (storedProfileImageKey) {
      await this.profileImages.deleteBestEffort(member.profileImageKey);
    }

    const { onboardingCompleted, ...user } = await this.toProfileResponse(
      updatedMember,
      sensitiveInfoAgreed,
    );

    return {
      onboardingCompleted,
      user,
    };
  }

  async getOnboarding(userId: string) {
    const member = await this.findActiveMemberOrThrow(userId);

    return {
      id: Number(member.id),
      nickname: member.nickname,
      profileImage: await this.resolveProfileImage(member),
      profileImageSource: this.getProfileImageSource(member),
      gender: member.gender,
      ageGroup: member.ageGroup,
      baselineType: member.baselineType,
      sensitiveInfoAgreed:
        member.gender === 'M'
          ? false
          : await this.getSensitiveInfoAgreed(member.id, member.sensInfo),
      onboardingCompleted: this.isOnboardingCompleted(member),
    };
  }

  async getMe(userId: string) {
    const member = await this.findActiveMemberWithSocialAccountsOrThrow(userId);

    return this.toMeResponse(member);
  }

  async getNotificationSettings(
    userId: string,
  ): Promise<NotificationSettingsResponseDto> {
    const member = await this.findActiveMemberOrThrow(userId);

    return this.toNotificationSettings(member);
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsRequestDto,
  ): Promise<NotificationSettingsResponseDto> {
    // 존재·활성 회원 검증(없으면 USER_NOT_FOUND). 전달된 필드만 반영한다.
    await this.findActiveMemberOrThrow(userId);

    const data: {
      recordAlarm?: AlarmFlag;
      reportAlarm?: AlarmFlag;
      warnAlarm?: AlarmFlag;
    } = {};
    if (dto.recordAlarm !== undefined) data.recordAlarm = dto.recordAlarm;
    if (dto.reportAlarm !== undefined) data.reportAlarm = dto.reportAlarm;
    if (dto.warnAlarm !== undefined) data.warnAlarm = dto.warnAlarm;

    const updated = await this.prisma.member.update({
      where: { id: this.toBigIntId(userId) },
      data,
    });

    return this.toNotificationSettings(updated);
  }

  // null(레거시 데이터)은 기본값 'Y'로 폴백한다(스케줄러의 "null=기본 Y" 규칙과 동일).
  private toNotificationSettings(member: {
    recordAlarm: string | null;
    reportAlarm: string | null;
    warnAlarm: string | null;
  }): NotificationSettingsResponseDto {
    return {
      recordAlarm: member.recordAlarm === 'N' ? 'N' : 'Y',
      reportAlarm: member.reportAlarm === 'N' ? 'N' : 'Y',
      warnAlarm: member.warnAlarm === 'N' ? 'N' : 'Y',
    };
  }

  async getSensitiveInfoConsent(userId: string) {
    const member = await this.findActiveMemberOrThrow(userId);
    this.assertSensitiveInfoAvailable(member.gender);

    const consent = await this.prisma.memberConsent.findFirst({
      where: {
        userId: this.toBigIntId(userId),
        consentType: 'SENSITIVE',
      },
      orderBy: { id: 'desc' },
    });

    return {
      agreed: consent?.agreed ?? this.toBoolean(member.sensInfo),
      policyVersion: consent?.policyVersion ?? 'legacy',
      agreedAt:
        consent && !consent.agreed
          ? null
          : (consent?.agreedAt?.toISOString() ??
            (this.toBoolean(member.sensInfo)
              ? member.regDate.toISOString()
              : null)),
      withdrawnAt: consent?.withdrawnAt?.toISOString() ?? null,
    };
  }

  async updateSensitiveInfoConsent(
    userId: string,
    dto: UpdateSensitiveInfoConsentRequestDto,
  ) {
    if (typeof dto.agreed !== 'boolean') {
      throw new BusinessException(
        UserErrorCode.SENSITIVE_INFO_AGREEMENT_INVALID,
        'agreed는 boolean 값이어야 합니다.',
      );
    }

    if (typeof dto.policyVersion !== 'string' || !dto.policyVersion.trim()) {
      throw new BusinessException(
        UserErrorCode.POLICY_VERSION_REQUIRED,
        'policyVersion은 필수입니다.',
      );
    }

    const member = await this.findActiveMemberOrThrow(userId);
    this.assertSensitiveInfoAvailable(member.gender);

    const now = new Date();
    const consent = await this.prisma.$transaction(async (tx) => {
      let savedConsent: MemberConsent;

      if (dto.agreed) {
        savedConsent = await tx.memberConsent.create({
          data: {
            userId: member.id,
            consentType: 'SENSITIVE',
            agreed: true,
            policyVersion: dto.policyVersion,
            agreedAt: now,
          },
        });
      } else {
        const latestConsent = await tx.memberConsent.findFirst({
          where: { userId: member.id, consentType: 'SENSITIVE' },
          orderBy: { id: 'desc' },
        });

        savedConsent = latestConsent
          ? await tx.memberConsent.update({
              where: { id: latestConsent.id },
              data: {
                agreed: false,
                policyVersion: dto.policyVersion,
                withdrawnAt: now,
              },
            })
          : await tx.memberConsent.create({
              data: {
                userId: member.id,
                consentType: 'SENSITIVE',
                agreed: false,
                policyVersion: dto.policyVersion,
                withdrawnAt: now,
              },
            });

        await tx.lifeRecord.updateMany({
          where: { userId: member.id },
          data: { hormone: null },
        });
      }

      await tx.member.update({
        where: { id: member.id },
        data: { sensInfo: dto.agreed ? 'Y' : 'F' },
      });

      return savedConsent;
    });

    return {
      agreed: consent.agreed,
      policyVersion: consent.policyVersion,
      agreedAt: consent.agreed
        ? (consent.agreedAt?.toISOString() ?? null)
        : null,
      withdrawnAt: consent.withdrawnAt?.toISOString() ?? null,
    };
  }

  async updateMe(
    userId: string,
    dto: UpdateMeRequestDto,
    profileImage?: ProfileImageFile,
  ) {
    this.assertNickname(dto.nickname);

    const member = await this.findActiveMemberOrThrow(userId);
    if (dto.nickname !== undefined) {
      await this.assertNicknameAvailable(dto.nickname, member.id);
    }

    const storedProfileImageKey = profileImage
      ? await this.profileImages.save(userId, profileImage)
      : undefined;

    const updateData: {
      nickname?: string;
      profileImageKey?: string | null;
      gender?: string;
      ageGroup?: number;
      baselineType?: string;
      sensInfo?: string;
    } = {};

    if (dto.nickname !== undefined) {
      updateData.nickname = dto.nickname;
    }

    if (storedProfileImageKey !== undefined) {
      updateData.profileImageKey = storedProfileImageKey;
    }

    if (dto.gender !== undefined) {
      updateData.gender = dto.gender;
      if (dto.gender === 'M') {
        updateData.sensInfo = 'F';
      }
    }

    if (dto.ageGroup !== undefined) {
      updateData.ageGroup = dto.ageGroup;
    }

    if (dto.baselineType !== undefined) {
      updateData.baselineType = dto.baselineType;
    }

    if (Object.keys(updateData).length === 0) {
      return this.toProfileResponse(
        member,
        await this.getSensitiveInfoAgreed(member.id, member.sensInfo),
      );
    }

    let updatedMember: MemberResponseSource;
    try {
      updatedMember = await this.prisma.$transaction(async (tx) => {
        const savedMember = await tx.member.update({
          where: { id: member.id },
          data: updateData,
        });

        if (dto.gender === 'M') {
          const latestConsent = await tx.memberConsent.findFirst({
            where: { userId: member.id, consentType: 'SENSITIVE' },
            orderBy: { id: 'desc' },
          });

          if (latestConsent?.agreed) {
            await tx.memberConsent.update({
              where: { id: latestConsent.id },
              data: {
                agreed: false,
                withdrawnAt: new Date(),
              },
            });
          }

          await tx.lifeRecord.updateMany({
            where: { userId: member.id },
            data: { hormone: null },
          });
        }

        return savedMember;
      });
    } catch (error) {
      await this.profileImages.deleteBestEffort(storedProfileImageKey);
      this.rethrowNicknameConflict(error);
      throw error;
    }

    if (storedProfileImageKey) {
      await this.profileImages.deleteBestEffort(member.profileImageKey);
    }

    return this.toProfileResponse(
      updatedMember,
      dto.gender === 'M'
        ? false
        : await this.getSensitiveInfoAgreed(
            updatedMember.id,
            updatedMember.sensInfo,
          ),
    );
  }

  async updateProfileImage(
    userId: string,
    profileImage: ProfileImageFile | undefined,
  ) {
    this.profileImages.assertRequired(profileImage);
    const member = await this.findActiveMemberOrThrow(userId);
    const newKey = await this.profileImages.save(userId, profileImage);

    let updatedMember: MemberResponseSource;
    try {
      updatedMember = await this.prisma.member.update({
        where: { id: member.id },
        data: { profileImageKey: newKey },
      });
    } catch {
      await this.profileImages.deleteBestEffort(newKey);
      throw new BusinessException(
        UserErrorCode.PROFILE_IMAGE_UPDATE_FAILED,
        '프로필 이미지 정보를 변경하지 못했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.profileImages.deleteBestEffort(member.profileImageKey);
    return this.toProfileImageResponse(updatedMember);
  }

  async deleteMe(userId: string, dto: DeleteMeRequestDto) {
    if (dto.confirmation !== '탈퇴합니다') {
      throw new BusinessException(
        UserErrorCode.WITHDRAWAL_CONFIRMATION_INVALID,
        '회원탈퇴 확인 문구가 올바르지 않습니다.',
      );
    }

    const member = await this.findActiveMemberOrThrow(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.lifeTag.deleteMany({
        where: { life: { userId: member.id } },
      });
      await tx.lifeFoodTag.deleteMany({
        where: { life: { userId: member.id } },
      });
      await tx.medicineMap.deleteMany({
        where: { lifeRecord: { userId: member.id } },
      });
      await tx.alarmMap.deleteMany({ where: { userId: member.id } });
      await tx.memberConsent.deleteMany({ where: { userId: member.id } });
      await tx.refreshToken.deleteMany({ where: { userId: member.id } });
      await tx.socialAccount.deleteMany({ where: { userId: member.id } });
      await tx.guideFeedback.deleteMany({ where: { userId: member.id } });
      await tx.weeklyRecord.deleteMany({ where: { userId: member.id } });
      await tx.monthlyRecord.deleteMany({ where: { userId: member.id } });
      await tx.boogleRecord.deleteMany({ where: { userId: member.id } });
      await tx.lifeRecord.deleteMany({ where: { userId: member.id } });
      await tx.member.delete({ where: { id: member.id } });
    });

    await this.profileImages.deleteBestEffort(member.profileImageKey);

    return null;
  }

  private async findMemberOrThrow(userId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: this.toBigIntId(userId) },
    });

    if (!member) {
      throw new BusinessException(
        UserErrorCode.USER_NOT_FOUND,
        '사용자를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return member;
  }

  private async findActiveMemberWithSocialAccountsOrThrow(userId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: this.toBigIntId(userId) },
      include: {
        socialAccounts: {
          select: {
            provider: true,
            email: true,
            regDate: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
        memberConsents: {
          where: { consentType: 'SENSITIVE' },
          select: { agreed: true },
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });

    if (!member) {
      throw new BusinessException(
        UserErrorCode.USER_NOT_FOUND,
        '사용자를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    this.assertActiveMember(member);
    return member;
  }

  private async findActiveMemberOrThrow(userId: string) {
    const member = await this.findMemberOrThrow(userId);
    this.assertActiveMember(member);
    return member;
  }

  private assertActiveMember(member: MemberResponseSource) {
    if (member.status === 'D') {
      throw new BusinessException(
        UserErrorCode.USER_WITHDRAWN,
        '탈퇴한 회원입니다.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private assertNickname(nickname?: string) {
    if (nickname !== undefined && nickname.length > 10) {
      throw new BusinessException(
        UserErrorCode.NICKNAME_TOO_LONG,
        'nickname은 최대 10자까지 입력할 수 있습니다.',
      );
    }
  }

  private async assertNicknameAvailable(nickname: string, memberId: bigint) {
    const duplicated = await this.prisma.member.findFirst({
      where: {
        nickname,
        id: { not: memberId },
      },
      select: { id: true },
    });

    if (duplicated) {
      throw new BusinessException(
        UserErrorCode.NICKNAME_ALREADY_EXISTS,
        '이미 사용 중인 닉네임입니다.',
        HttpStatus.CONFLICT,
      );
    }
  }

  private rethrowNicknameConflict(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    ) {
      throw new BusinessException(
        UserErrorCode.NICKNAME_ALREADY_EXISTS,
        '이미 사용 중인 닉네임입니다.',
        HttpStatus.CONFLICT,
      );
    }
  }

  private isSensitiveInfoAvailable(gender: string | null) {
    return gender === 'F' || gender === 'N';
  }

  private assertSensitiveInfoAvailable(gender: string | null) {
    if (!this.isSensitiveInfoAvailable(gender)) {
      throw new BusinessException(
        UserErrorCode.SENSITIVE_INFO_NOT_AVAILABLE,
        '현재 성별 설정에서는 민감정보 수집 동의 기능을 사용할 수 없습니다.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private assertOnboardingSensitiveInfo(
    dto: SaveOnboardingRequestDto,
    sensitiveInfoAvailable: boolean,
  ) {
    if (!sensitiveInfoAvailable) {
      return;
    }

    if (typeof dto.sensitiveInfoAgreed !== 'boolean') {
      throw new BusinessException(
        UserErrorCode.SENSITIVE_INFO_AGREEMENT_INVALID,
        '민감정보 수집 동의 여부를 선택해주세요.',
      );
    }

    if (
      typeof dto.sensitiveInfoPolicyVersion !== 'string' ||
      !dto.sensitiveInfoPolicyVersion.trim()
    ) {
      throw new BusinessException(
        UserErrorCode.POLICY_VERSION_REQUIRED,
        '민감정보 동의문 버전은 필수입니다.',
      );
    }
  }

  private async toProfileResponse(
    member: MemberResponseSource,
    sensitiveInfoAgreed = this.toBoolean(member.sensInfo),
  ) {
    return {
      id: Number(member.id),
      email: member.email,
      nickname: member.nickname,
      profileImage: await this.resolveProfileImage(member),
      profileImageSource: this.getProfileImageSource(member),
      gender: member.gender,
      ageGroup: member.ageGroup,
      baselineType: member.baselineType,
      sensitiveInfoAgreed,
      onboardingCompleted: this.isOnboardingCompleted(member),
    };
  }

  private async toMeResponse(member: MemberWithSocialAccountsResponseSource) {
    return {
      ...(await this.toProfileResponse(
        member,
        member.gender === 'M'
          ? false
          : (member.memberConsents?.[0]?.agreed ??
              this.toBoolean(member.sensInfo)),
      )),
      socialAccounts: (member.socialAccounts ?? []).map((account) => ({
        provider: this.toProviderResponse(account.provider),
        maskedEmail: this.maskEmail(account.email),
        linkedAt: account.regDate.toISOString(),
      })),
      regDate: member.regDate,
    };
  }

  private async toProfileImageResponse(member: MemberResponseSource) {
    return {
      profileImage: await this.resolveProfileImage(member),
      profileImageSource: this.getProfileImageSource(member),
    };
  }

  private resolveProfileImage(member: MemberResponseSource) {
    return member.profileImageKey
      ? this.profileImages.getUrl(member.profileImageKey)
      : Promise.resolve(member.profileImg);
  }

  private getProfileImageSource(member: MemberResponseSource) {
    if (member.profileImageKey) {
      return 'CUSTOM';
    }
    return member.profileImg ? 'SOCIAL' : null;
  }

  private toProviderResponse(provider?: string) {
    if (provider === 'K' || provider === 'kakao') {
      return 'KAKAO';
    }

    if (provider === 'G' || provider === 'google') {
      return 'GOOGLE';
    }

    return null;
  }

  private isOnboardingCompleted(member: MemberResponseSource) {
    return Boolean(
      member.nickname &&
      member.gender &&
      member.ageGroup &&
      member.baselineType,
    );
  }

  private toBoolean(value: string) {
    return value === 'Y';
  }

  private async getSensitiveInfoAgreed(userId: bigint, fallback: string) {
    const consent = await this.prisma.memberConsent.findFirst({
      where: { userId, consentType: 'SENSITIVE' },
      orderBy: { id: 'desc' },
    });

    return consent?.agreed ?? this.toBoolean(fallback);
  }

  private maskEmail(email: string | null) {
    if (!email) {
      return null;
    }

    const [localPart, domain] = email.split('@');
    if (!domain) {
      return email;
    }

    const visibleLength = Math.min(4, Math.max(1, localPart.length));
    return `${localPart.slice(0, visibleLength)}****@${domain}`;
  }

  private toBigIntId(id: string) {
    return BigInt(id);
  }
}
