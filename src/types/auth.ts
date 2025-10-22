export interface SignupDto {
  name: string;
  email: string;
  password: string;
}

export interface SigninDto {
  email: string;
  password: string;
}

export interface User {
  name: string;
  email: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    access_token: string;
  };
}
