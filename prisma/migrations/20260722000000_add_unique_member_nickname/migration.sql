-- 최종 회원 명세에 맞춰 닉네임 길이와 중복 방지 제약을 적용합니다.
ALTER TABLE `member`
    MODIFY `nickname` VARCHAR(10) NULL,
    ADD CONSTRAINT `member_nickname_key` UNIQUE (`nickname`);
