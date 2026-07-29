import { Link } from "react-router-dom";

function Navbar() {
  return (
    <div style={styles.navbar}>
      {/* Left Side */}
      <div style={styles.left}>
        <h2 style={styles.title}>🚦 TrafficVision AI</h2>
      </div>

      {/* Right Side */}
      <div style={styles.right}>
        <Link to="/notifications" style={styles.link}>
          🔔 Notifications
        </Link>

        <Link to="/admin" style={styles.link}>
          👤 Admin
        </Link>
      </div>
    </div>
  );
}

const styles = {
  navbar: {
    height: "70px",
    backgroundColor: "#2563EB",
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 30px",
    boxSizing: "border-box",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },

  left: {
    display: "flex",
    alignItems: "center",
  },

  title: {
    margin: 0,
    fontSize: "32px",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: "30px",
  },

  link: {
    color: "white",
    textDecoration: "none",
    fontSize: "20px",
    fontWeight: "bold",
    padding: "8px 14px",
    borderRadius: "6px",
    transition: "0.3s",
  },
};

export default Navbar;