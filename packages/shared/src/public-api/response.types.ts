export interface PublicApiResponse<T> {
  data: T;
  meta?: { page?: number; limit?: number; total?: number };
  error?: { code: string; message: string };
}

export interface V1WorkflowResponse {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface V1DocumentResponse {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
