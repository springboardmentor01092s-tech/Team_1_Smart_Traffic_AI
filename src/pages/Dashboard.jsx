import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import TrafficTable from "../components/TrafficTable";

function Dashboard() {
  return (
    <div>
      <Navbar />

      <div style={styles.main}>
        <Sidebar />

        <div style={styles.content}>
          <h1 style={styles.heading}>🚦 TrafficVision AI Dashboard</h1>

          <div style={styles.cards}>
            <StatCard
              title="Total Vehicles"
              value="15,230"
              icon="🚗"
            />

            <StatCard
              title="Congested Roads"
              value="12"
              icon="🚦"
            />

            <StatCard
              title="Alerts"
              value="5"
              icon="⚠️"
            />

            <StatCard
              title="Accidents"
              value="3"
              icon="🚑"
            />
          </div>

          <TrafficTable />
        </div>
      </div>
    </div>
  );
}

const styles = {
  main: {
    display: "flex",
  },

  content: {
    flex: 1,
    padding: "30px",
    background: "#f5f7fb",
    minHeight: "100vh",
  },

  heading: {
    fontSize: "52px",
    color: "#1E3A8A",
    marginBottom: "30px",
    fontWeight: "bold",
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "25px",
    marginBottom: "40px",
  },
};

export default Dashboard;