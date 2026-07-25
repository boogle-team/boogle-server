import type { GuideFeedbackStatus } from './guide-screen-response.dto';

export interface CreateGuideFeedbackResponseDto {
  guideFeedbackId: string;
  guideId: number;
  feedback: GuideFeedbackStatus;
  regDate: string;
}

export interface UpdateGuideFeedbackResponseDto {
  guideFeedbackId: string;
  guideId: number;
  feedback: GuideFeedbackStatus;
  regDate: string;
  updatedAt: string;
}

export interface DeleteGuideFeedbackResponseDto {
  guideFeedbackId: string;
  guideId: number;
  deleted: true;
}
