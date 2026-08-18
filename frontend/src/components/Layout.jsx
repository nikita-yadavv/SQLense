/**
 * Layout — shared authenticated app shell.
 * Wraps every protected page with the Sidebar.
 */
import Sidebar from "./Sidebar";

export default function Layout({ children, onNewChat }) {
  return (
    <div className="app">
      <Sidebar onNewChat={onNewChat} />
      {children}
    </div>
  );
}
