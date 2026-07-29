import {
  NOTIFICATION_TEMPLATES,
  extractPlaceholders,
  renderTemplate,
} from './notification-templates';

describe('notification-templates', () => {
  it('모든 템플릿의 {placeholder}는 requiredParams에 선언돼 있다', () => {
    // renderTemplate은 값 누락 시 throw하지 않으므로, 선언 누락은 이 테스트가
    // 잡는다(= 런타임에 자리표시자가 그대로 노출되는 버그 방지).
    for (const template of Object.values(NOTIFICATION_TEMPLATES)) {
      const placeholders = [
        ...extractPlaceholders(template.title),
        ...extractPlaceholders(template.content),
      ];
      for (const key of placeholders) {
        expect(template.requiredParams).toContain(key);
      }
    }
  });

  it('renderTemplate은 params로 {키}를 치환한다', () => {
    expect(renderTemplate('{days}일째 기록 중이에요!', { days: 3 })).toBe(
      '3일째 기록 중이에요!',
    );
  });

  it('renderTemplate은 params가 없으면 자리표시자를 그대로 둔다(크래시 없음)', () => {
    expect(renderTemplate('{days}일째!')).toBe('{days}일째!');
  });
});
