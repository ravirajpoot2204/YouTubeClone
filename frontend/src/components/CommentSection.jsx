"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { getComments, postComment, deleteComment, editComment } from "@/lib/axios";
import { jwtDecode } from 'jwt-decode';
import api from '@/lib/axios';

export default function CommentSection({ videoId }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const isLoggedIn = !!token;

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);



const [currentUser, setCurrentUser] = useState(null);

useEffect(() => {
  if (!token) return;
  const decoded = jwtDecode(token);
  const userId = decoded.id || decoded._id;          // keep the _id
  api.get(`/users/${userId}/profile`)
    .then(res => setCurrentUser({ ...res.data, _id: userId }))   // add _id
    .catch(console.error);
}, [token]);

  useEffect(() => {
    if (videoId) fetchComments();
  }, [videoId]);

  
  const fetchComments = async () => {
    try {
      const data = await getComments(videoId);
      setComments(data);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    try {
      const comment = await postComment(videoId, newComment);
      setComments([comment, ...comments]);
      setNewComment("");
    } catch (err) {
      console.error("Post failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    try {
      await deleteComment(commentId);
      setComments(comments.filter((c) => c._id !== commentId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleEdit = async (commentId, content) => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    try {
      const updated = await editComment(commentId, content);
      setComments(comments.map((c) => (c._id === commentId ? updated : c)));
    } catch (err) {
      console.error("Edit failed:", err);
    }
  };

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading comments…</div>;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">
        Comments ({comments.length})
      </h3>

      {/* Comment form */}
      <form onSubmit={handlePost} className="flex gap-3 mb-6">
       <Image
  src={currentUser?.avatar || "/default-avatar.png"}
  alt="Your avatar"
  width={36}
  height={36}
  className="rounded-full mt-1"
/>
        <div className="flex-1">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={isLoggedIn ? "Add a comment…" : "Log in to comment"}
            className="w-full border-b border-gray-300 outline-none pb-1 text-sm focus:border-blue-500"
            disabled={!isLoggedIn}
          />
          {isLoggedIn && (
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setNewComment("")}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm disabled:opacity-50"
              >
                Comment
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-gray-500 text-sm">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
           <CommentItem
  key={comment._id}
  comment={comment}
  currentUser={currentUser}        // <-- pass it
  onDelete={handleDelete}
  onEdit={handleEdit}
/>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, currentUser, onDelete, onEdit }) {

const isOwner = currentUser && currentUser._id === comment.user._id;
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const handleSaveEdit = () => {
    if (editContent.trim() === comment.content) {
      setEditing(false);
      return;
    }
    onEdit(comment._id, editContent);
    setEditing(false);
  };

  return (
    <div className="flex gap-3">
      <Image
     src={comment.user?.avatar || "/default-avatar.jpg"}
  alt={comment.user?.name || "User avatar"}       
        width={36}
        height={36}
        className="rounded-full mt-1"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {comment.user?.name || "User"}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
          {comment.edited && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>
        {editing ? (
          <div className="mt-1">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full border-b border-gray-300 outline-none text-sm"
            />
            <div className="flex gap-2 mt-1">
              <button onClick={handleSaveEdit} className="text-blue-600 text-xs">
                Save
              </button>
              <button onClick={() => setEditing(false)} className="text-gray-600 text-xs">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-800">{comment.content}</p>
        )}
        {isOwner && !editing && (
          <div className="flex gap-2 mt-1">
            <button onClick={() => setEditing(true)} className="text-xs text-blue-600">
              Edit
            </button>
            <button onClick={() => onDelete(comment._id)} className="text-xs text-red-600">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}