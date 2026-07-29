function StatCard({ title, value, icon }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.title}>
        {icon} {title}
      </h3>

      <h1 style={styles.value}>{value}</h1>
    </div>
  );
}

const styles = {
  card: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "25px",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },

  title: {
    color: "#374151",
    fontSize: "22px",
    marginBottom: "20px",
    fontWeight: "600",
  },

  value: {
    color: "#111827",   // Dark black
    fontSize: "58px",
    fontWeight: "bold",
    margin: 0,
  },
};

export default StatCard;