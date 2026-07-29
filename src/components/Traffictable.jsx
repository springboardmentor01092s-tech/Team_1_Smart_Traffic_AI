function TrafficTable() {
  const trafficData = [
    {
      road: "GST Road",
      vehicles: 320,
      congestion: "High",
      status: "Heavy",
    },
    {
      road: "OMR",
      vehicles: 180,
      congestion: "Medium",
      status: "Moderate",
    },
    {
      road: "Anna Salai",
      vehicles: 90,
      congestion: "Low",
      status: "Smooth",
    },
    {
      road: "ECR",
      vehicles: 210,
      congestion: "Medium",
      status: "Busy",
    },
  ];

  return (
    <div style={styles.container}>
      <h2>🚗 Live Traffic Details</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>Road</th>
            <th>Vehicles</th>
            <th>Congestion</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {trafficData.map((item, index) => (
            <tr key={index}>
              <td>{item.road}</td>
              <td>{item.vehicles}</td>
              <td>{item.congestion}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: {
    marginTop: "40px",
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },
};

export default TrafficTable;