import type { GuideFeedbackStatus } from './guide-screen-response.dto';

export interface CreateGuideFeedbackResponseDto {
  guideFeedbackId: string;
  guideContentId: number;
  feedback: GuideFeedbackStatus;
  regDate: string;
}

export interface UpdateGuideFeedbackResponseDto {
  guideFeedbackId: string;
  guideContentId: number;
  feedback: GuideFeedbackStatus;
  regDate: string;
  updatedAt: string;
}

export interface DeleteGuideFeedbackResponseDto {
  guideFeedbackId: string;
  guideContentId: number;
  deleted: true;
}
