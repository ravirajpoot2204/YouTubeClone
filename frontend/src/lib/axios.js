import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
// ---------- API helpers ----------
export const toggleLike = (videoId) =>
  api.post(`/videos/${videoId}/like`).then(res => res.data);

export const toggleDislike = (videoId) =>
  api.post(`/videos/${videoId}/dislike`).then(res => res.data);

export const getComments = (videoId) =>
  api.get(`/comments/video/${videoId}`).then(res => res.data.comments);

export const postComment = (videoId, content) =>
  api.post(`/comments/video/${videoId}`, { content }).then(res => res.data.comment);

export const deleteComment = (commentId) =>
  api.delete(`/comments/${commentId}`).then(res => res.data);

export const editComment = (commentId, content) =>
  api.put(`/comments/${commentId}`, { content }).then(res => res.data.comment);
// Response interceptor: redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);