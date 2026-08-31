import { useChatConnection } from "../ChatConnectionContext";

export default function MemberSidebar() {
  const { onlineUsers } = useChatConnection();

  return (
    <aside className="member-sidebar" aria-label="Membros online">
      <div className="member-sidebar-category">Online — {onlineUsers.length}</div>
      <div className="member-list">
        {onlineUsers.map((name) => (
          <div key={name} className="member-item">
            <div className="member-avatar-wrap">
              <span className="user-avatar">{name.slice(0, 2).toUpperCase()}</span>
              <span className="member-online-dot" aria-label="Online" />
            </div>
            <span className="member-name">{name}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
