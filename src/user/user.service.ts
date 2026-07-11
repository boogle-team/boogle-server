import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import { SaveOnboardingRequestDto } from './dto/save-onboarding-request.dto';
import { UpdateMeRequestDto } from './dto/update-me-request.dto';
import { UserErrorCode } from './user-error-code.enum';

interface MemberResponseSource {
  id: bigint;
  email: string | null;
  nickname: string | null;
  profileImg: string | null;
  gender: string | null;
  ageGroup: number | null;
  baselineType: string | null;
  sensInfo: string;
  status: string;
  regDate?: Date;
}

interface SocialAccountResponseSource {
  provider: string;
}

interface MemberWithSocialAccountsResponseSource extends MemberResponseSource {
  socialAccounts?: SocialAccountResponseSource[];
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async saveOnboarding(userId: string, dto: SaveOnboardingRequestDto) {
    this.assertNickname(dto.nickname);

    const member = await this.findActiveMemberOrThrow(userId);

    if (this.isOnboardingCompleted(member)) {
      throw new BusinessException(
        UserErrorCode.ONBOARDING_ALREADY_COMPLETED,
        '이미 온보딩을 완료한 사용자입니다.',
        HttpStatus.CONFLICT,
      );
    }

    const onboardingData: {
      nickname: string;
      profileImg?: string | null;
      gender: string;
      ageGroup: number;
      baselineType: string;
      sensInfo: string;
    } = {
      nickname: dto.nickname,
      gender: dto.gender,
      ageGroup: dto.ageGroup,
      baselineType: dto.baselineType,
      sensInfo: this.toSensInfoFlag(dto.sensInfo),
    };

    if (dto.profileImage !== undefined) {
      onboardingData.profileImg = dto.profileImage;
    }

    const updatedMember = await this.prisma.member.update({
      where: { id: this.toBigIntId(userId) },
      data: onboardingData,
    });

    return {
      ...this.toProfileResponse(updatedMember),
      onboardingCompleted: true,
    };
  }

  async getOnboarding(userId: string) {
    const member = await this.findActiveMemberOrThrow(userId);

    return {
      id: Number(member.id),
      nickname: member.nickname,
      profileImage: member.profileImg,
      gender: member.gender,
      ageGroup: member.ageGroup,
      baselineType: member.baselineType,
      sensInfo: this.toBoolean(member.sensInfo),
      onboardingCompleted: this.isOnboardingCompleted(member),
    };
  }

  async getMe(userId: string) {
    const member = await this.findActiveMemberWithSocialAccountsOrThrow(userId);

    return this.toMeResponse(member);
  }

  async updateMe(userId: string, dto: UpdateMeRequestDto) {
    this.assertNickname(dto.nickname);

    const member = await this.findActiveMemberOrThrow(userId);

    const updateData: {
      nickname?: string;
      profileImg?: string | null;
      gender?: string;
      ageGroup?: number;
      baselineType?: string;
    } = {};

    if (dto.nickname !== undefined) {
      updateData.nickname = dto.nickname;
    }

    if (dto.profileImage !== undefined) {
      updateData.profileImg = dto.profileImage;
    }

    if (dto.gender !== undefined) {
      updateData.gender = dto.gender;
    }

    if (dto.ageGroup !== undefined) {
      updateData.ageGroup = dto.ageGroup;
    }

    if (dto.baselineType !== undefined) {
      updateData.baselineType = dto.baselineType;
    }

    if (Object.keys(updateData).length === 0) {
      return this.toProfileResponse(member);
    }

    const updatedMember = await this.prisma.member.update({
      where: { id: this.toBigIntId(userId) },
      data: updateData,
    });

    return this.toProfileResponse(updatedMember);
  }

  async deleteMe(userId: string) {
    const member = await this.findActiveMemberOrThrow(userId);

    await this.prisma.$transaction([
      this.prisma.member.update({
        where: { id: member.id },
        data: {
          status: 'D',
          deleteDate: new Date(),
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId: member.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

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
          },
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

  private toProfileResponse(member: MemberResponseSource) {
    return {
      id: Number(member.id),
      email: member.email,
      nickname: member.nickname,
      profileImage: member.profileImg,
      gender: member.gender,
      ageGroup: member.ageGroup,
      baselineType: member.baselineType,
      sensInfo: this.toBoolean(member.sensInfo),
      onboardingCompleted: this.isOnboardingCompleted(member),
    };
  }

  private toMeResponse(member: MemberWithSocialAccountsResponseSource) {
    return {
      ...this.toProfileResponse(member),
      provider: this.toProviderResponse(member.socialAccounts?.[0]?.provider),
      regDate: member.regDate,
    };
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

  private toSensInfoFlag(value: boolean) {
    return value ? 'Y' : 'F';
  }

  private toBoolean(value: string) {
    return value === 'Y';
  }

  private toBigIntId(id: string) {
    return BigInt(id);
  }
}
