type OnlineUsersProps = {
  count: number;
};

export function OnlineUsers({ count }: OnlineUsersProps) {
  return (
    <div className="online-users" aria-live="polite">
      <span className="online-users-dot" />
      <strong>{count.toLocaleString()}</strong>
      <span>online now</span>
    </div>
  );
}
