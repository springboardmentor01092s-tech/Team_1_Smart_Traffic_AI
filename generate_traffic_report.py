import os
import sys
import json
import uuid
from datetime import datetime, timedelta, timezone
import psycopg2
from psycopg2.extras import RealDictCursor

# Optional styling and chart dependencies
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def load_env():
    """Load environment variables from .env if available."""
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(backend_dir, '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "trafficvision_ai")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")
DATABASE_URL = os.getenv("DATABASE_URL")

SPEED_CONFIGS = {
    'highway': 80.0,
    'arterial': 50.0,
    'local': 35.0
}
DEFAULT_FREE_FLOW_SPEED = 50.0


def get_db_connection():
    """Establish connection to PostgreSQL database."""
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        cursor_factory=RealDictCursor
    )


def ensure_reports_directory():
    """Ensure output reports directory exists."""
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    reports_dir = os.path.join(backend_dir, 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    return reports_dir


def fetch_report_data():
    """Fetch raw data from PostgreSQL database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Fetch locations with their latest prediction and latest traffic reading
    locations_query = """
    SELECT 
        l.location_id,
        l.name AS location_name,
        l.road_type,
        l.latitude,
        l.longitude,
        p.predicted_for,
        p.predicted_congestion,
        p.confidence_score,
        p.model_version,
        t.average_speed_kmph,
        t.vehicle_count,
        t.congestion_level AS current_congestion,
        t.recorded_at AS last_traffic_recorded_at
    FROM locations l
    LEFT JOIN LATERAL (
        SELECT predicted_for, predicted_congestion, confidence_score, model_version, created_at
        FROM predictions
        WHERE location_id = l.location_id
        ORDER BY created_at DESC
        LIMIT 1
    ) p ON true
    LEFT JOIN LATERAL (
        SELECT average_speed_kmph, vehicle_count, congestion_level, recorded_at
        FROM traffic_data
        WHERE location_id = l.location_id
        ORDER BY recorded_at DESC
        LIMIT 1
    ) t ON true
    ORDER BY l.name;
    """
    cursor.execute(locations_query)
    locations_data = cursor.fetchall()

    # 2. Fetch traffic data from the last 6 hours
    traffic_recent_query = """
    SELECT td.*, l.name AS location_name
    FROM traffic_data td
    JOIN locations l ON td.location_id = l.location_id
    WHERE td.recorded_at >= NOW() - INTERVAL '6 hours'
    ORDER BY td.recorded_at DESC;
    """
    cursor.execute(traffic_recent_query)
    recent_traffic = cursor.fetchall()

    # 3. Fetch alerts from the last 24 hours
    alerts_query = """
    SELECT a.*, l.name AS location_name
    FROM alerts a
    JOIN locations l ON a.location_id = l.location_id
    WHERE a.created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY a.created_at DESC;
    """
    cursor.execute(alerts_query)
    recent_alerts = cursor.fetchall()

    cursor.close()
    conn.close()

    return locations_data, recent_traffic, recent_alerts


def process_report_metrics(locations_data, recent_traffic, recent_alerts):
    """Compute report metrics and summaries."""
    total_locations = len(locations_data)
    congestion_counts = {'low': 0, 'moderate': 0, 'high': 0, 'severe': 0}
    high_severe_risk_locations = []
    location_speed_ratios = []
    total_ratio_sum = 0.0
    valid_ratio_count = 0

    for loc in locations_data:
        road_type = loc['road_type'] or 'arterial'
        free_flow_speed = SPEED_CONFIGS.get(road_type.lower(), DEFAULT_FREE_FLOW_SPEED)
        
        avg_speed = float(loc['average_speed_kmph']) if loc['average_speed_kmph'] is not None else None
        
        # Speed ratio calculation
        if avg_speed is not None and free_flow_speed > 0:
            speed_ratio = round(avg_speed / free_flow_speed, 2)
            total_ratio_sum += speed_ratio
            valid_ratio_count += 1
        else:
            speed_ratio = None

        # Effective congestion level (prefer predicted, fallback to current or 'low')
        effective_congestion = loc['predicted_congestion'] or loc['current_congestion'] or 'low'
        effective_congestion = effective_congestion.lower()
        if effective_congestion in congestion_counts:
            congestion_counts[effective_congestion] += 1

        confidence = float(loc['confidence_score']) if loc['confidence_score'] is not None else 0.50

        location_info = {
            "location_id": str(loc['location_id']),
            "location_name": loc['location_name'],
            "road_type": road_type,
            "predicted_congestion": effective_congestion,
            "confidence_score": round(confidence, 2),
            "current_speed_kmph": round(avg_speed, 1) if avg_speed is not None else None,
            "free_flow_speed_kmph": free_flow_speed,
            "speed_ratio": speed_ratio,
            "predicted_for": loc['predicted_for'].isoformat() if loc['predicted_for'] else None
        }
        location_speed_ratios.append(location_info)

        if effective_congestion in ['high', 'severe']:
            high_severe_risk_locations.append(location_info)

    # Calculate congestion breakdown percentages
    congestion_breakdown = {}
    for level, count in congestion_counts.items():
        percentage = round((count / total_locations * 100), 2) if total_locations > 0 else 0.0
        congestion_breakdown[level] = {
            "count": count,
            "percentage": percentage
        }

    avg_network_speed_ratio = round(total_ratio_sum / valid_ratio_count, 2) if valid_ratio_count > 0 else 1.0

    # Alerts summary
    alerts_by_severity = {'info': 0, 'warning': 0, 'critical': 0}
    for alert in recent_alerts:
        sev = (alert['severity'] or 'info').lower()
        if sev in alerts_by_severity:
            alerts_by_severity[sev] += 1

    alerts_summary = {
        "info": alerts_by_severity['info'],
        "warning": alerts_by_severity['warning'],
        "critical": alerts_by_severity['critical'],
        "total": len(recent_alerts)
    }

    # Generate executive summary paragraph
    high_severe_count = congestion_counts['high'] + congestion_counts['severe']
    high_severe_pct = round((high_severe_count / total_locations * 100), 1) if total_locations > 0 else 0.0
    
    exec_summary = (
        f"TrafficVision AI monitored {total_locations} road segments/intersections. "
        f"Currently, {high_severe_count} locations ({high_severe_pct}%) exhibit high or severe congestion risk. "
        f"The network-wide average speed ratio is {avg_network_speed_ratio} relative to free-flow limits. "
        f"A total of {alerts_summary['total']} alerts ({alerts_summary['critical']} critical, {alerts_summary['warning']} warning) "
        f"were recorded over the past 24 hours."
    )

    return {
        "total_locations": total_locations,
        "congestion_breakdown": congestion_breakdown,
        "high_severe_risk_locations": high_severe_risk_locations,
        "average_speed_to_free_flow_ratio": avg_network_speed_ratio,
        "location_speed_ratios": location_speed_ratios,
        "alerts_summary_24h": alerts_summary,
        "executive_summary": exec_summary
    }


def generate_chart_image(congestion_breakdown, output_path):
    """Generate a pie chart for congestion distribution using matplotlib."""
    if not MATPLOTLIB_AVAILABLE:
        return None

    labels = ['Low', 'Moderate', 'High', 'Severe']
    colors_map = {
        'Low': '#10B981',      # Emerald Green
        'Moderate': '#F59E0B', # Amber/Yellow
        'High': '#EF4444',     # Red
        'Severe': '#7C3AED'    # Deep Purple/Severe
    }
    
    counts = [congestion_breakdown[lvl.lower()]['count'] for lvl in labels]
    slice_colors = [colors_map[lvl] for lvl in labels]

    # Filter out 0 counts for clean chart display if any present
    filtered_labels = []
    filtered_counts = []
    filtered_colors = []
    for l, c, col in zip(labels, counts, slice_colors):
        if c > 0:
            filtered_labels.append(l)
            filtered_counts.append(c)
            filtered_colors.append(col)

    if not filtered_counts:
        filtered_labels = labels
        filtered_counts = [1, 0, 0, 0]
        filtered_colors = slice_colors

    fig, ax = plt.subplots(figsize=(6, 3.5), subplot_kw=dict(aspect="equal"))
    wedges, texts, autotexts = ax.pie(
        filtered_counts,
        labels=filtered_labels,
        autopct='%1.1f%%',
        startangle=140,
        colors=filtered_colors,
        textprops=dict(color="w", weight="bold")
    )

    for text in texts:
        text.set_color('#1E293B')
        text.set_fontsize(10)
    for autotext in autotexts:
        autotext.set_fontsize(9)

    ax.set_title("Congestion Level Distribution", fontsize=12, pad=15, fontweight='bold', color='#0F172A')
    plt.tight_layout()
    plt.savefig(output_path, dpi=200, bbox_inches='tight')
    plt.close(fig)
    return output_path


def generate_pdf_report(report_data, pdf_path, chart_image_path=None):
    """Generate a styled PDF report using ReportLab."""
    if not REPORTLAB_AVAILABLE:
        print("ReportLab is not installed; skipping PDF generation.")
        return None

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A')
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B')
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155')
    )
    cell_header_style = ParagraphStyle(
        'CellHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )
    cell_body_style = ParagraphStyle(
        'CellBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#1F2937')
    )

    elements = []

    # Title & Header Banner
    generated_at_str = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    elements.append(Paragraph("TrafficVision AI - Traffic Prediction Report", title_style))
    elements.append(Paragraph(f"Generated at: {generated_at_str} | System Status: Active", subtitle_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=15))

    # Executive Summary Section
    elements.append(Paragraph("Executive Summary", heading_style))
    elements.append(Paragraph(report_data['summary']['executive_summary'], body_style))
    elements.append(Spacer(1, 12))

    # Congestion Chart & Breakdown Table side by side or stacked
    elements.append(Paragraph("Congestion Level Breakdown", heading_style))

    # Breakdown Table Data
    cb = report_data['summary']['congestion_breakdown']
    table_data = [
        [Paragraph("Congestion Level", cell_header_style), 
         Paragraph("Count", cell_header_style), 
         Paragraph("Percentage", cell_header_style)]
    ]
    for lvl in ['low', 'moderate', 'high', 'severe']:
        info = cb.get(lvl, {'count': 0, 'percentage': 0.0})
        table_data.append([
            Paragraph(lvl.capitalize(), cell_body_style),
            Paragraph(str(info['count']), cell_body_style),
            Paragraph(f"{info['percentage']}%", cell_body_style)
        ])

    cb_table = Table(table_data, colWidths=[150, 100, 100])
    cb_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E40AF')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))

    if chart_image_path and os.path.exists(chart_image_path):
        chart_img = Image(chart_image_path, width=240, height=140)
        # Put chart and table in a 2-column layout table
        split_table = Table([[cb_table, chart_img]], colWidths=[310, 230])
        split_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (1, 0), (1, 0), 10)
        ]))
        elements.append(split_table)
    else:
        elements.append(cb_table)

    elements.append(Spacer(1, 15))

    # High / Severe Risk Locations Table
    elements.append(Paragraph("High & Severe Congestion Risk Locations", heading_style))
    risk_locations = report_data['summary']['high_severe_risk_locations']

    risk_table_data = [
        [
            Paragraph("Location Name", cell_header_style),
            Paragraph("Road Type", cell_header_style),
            Paragraph("Predicted Risk", cell_header_style),
            Paragraph("Confidence", cell_header_style),
            Paragraph("Speed Ratio", cell_header_style)
        ]
    ]

    if risk_locations:
        for loc in risk_locations:
            ratio_str = f"{loc['speed_ratio']}" if loc['speed_ratio'] is not None else "N/A"
            risk_table_data.append([
                Paragraph(loc['location_name'], cell_body_style),
                Paragraph((loc['road_type'] or 'arterial').capitalize(), cell_body_style),
                Paragraph((loc['predicted_congestion'] or 'N/A').upper(), cell_body_style),
                Paragraph(f"{int(loc['confidence_score'] * 100)}%", cell_body_style),
                Paragraph(ratio_str, cell_body_style)
            ])
    else:
        risk_table_data.append([
            Paragraph("No locations currently flagged as high or severe risk.", cell_body_style),
            Paragraph("-", cell_body_style),
            Paragraph("-", cell_body_style),
            Paragraph("-", cell_body_style),
            Paragraph("-", cell_body_style)
        ])

    risk_table = Table(risk_table_data, colWidths=[180, 80, 90, 80, 110])
    risk_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#991B1B')), # Red Header
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#FCA5A5')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FEF2F2')])
    ]))
    elements.append(risk_table)
    elements.append(Spacer(1, 15))

    # Alerts Summary Table
    elements.append(Paragraph("24-Hour Alert Breakdown", heading_style))
    alerts_data = report_data['summary']['alerts_summary_24h']
    alert_table_data = [
        [Paragraph("Severity Level", cell_header_style), Paragraph("Alert Count (Last 24 Hours)", cell_header_style)],
        [Paragraph("Critical", cell_body_style), Paragraph(str(alerts_data['critical']), cell_body_style)],
        [Paragraph("Warning", cell_body_style), Paragraph(str(alerts_data['warning']), cell_body_style)],
        [Paragraph("Info", cell_body_style), Paragraph(str(alerts_data['info']), cell_body_style)],
        [Paragraph("Total Alerts", ParagraphStyle('Bld', parent=cell_body_style, fontName='Helvetica-Bold')), 
         Paragraph(str(alerts_data['total']), ParagraphStyle('Bld2', parent=cell_body_style, fontName='Helvetica-Bold'))]
    ]
    alert_table = Table(alert_table_data, colWidths=[200, 200])
    alert_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')])
    ]))
    elements.append(alert_table)

    # Footer space
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94A3B8'), spaceAfter=10))
    elements.append(Paragraph("TrafficVision AI © 2026 — Automated Traffic Intelligence Engine", subtitle_style))

    doc.build(elements)
    return pdf_path


def persist_report_to_db(report_payload, pdf_filename):
    """Persist report summary JSON into PostgreSQL reports table."""
    conn = get_db_connection()
    cursor = conn.cursor()

    insert_query = """
    INSERT INTO reports (report_title, generated_at, summary_json, pdf_filename, status)
    VALUES (%s, %s, %s, %s, %s)
    RETURNING report_id;
    """

    report_title = report_payload.get("report_title", "Traffic Prediction Report")
    generated_at = report_payload.get("generated_at")
    summary_json_str = json.dumps(report_payload["summary"])

    cursor.execute(insert_query, (
        report_title,
        generated_at,
        summary_json_str,
        pdf_filename,
        "completed"
    ))
    result = cursor.fetchone()
    report_id = str(result['report_id'])
    conn.commit()

    cursor.close()
    conn.close()

    return report_id


def generate_report():
    """Main function to generate the complete traffic prediction report."""
    now_utc = datetime.now(timezone.utc)
    timestamp_str = now_utc.strftime('%Y%m%d_%H%M%S')
    iso_now = now_utc.isoformat()
    
    reports_dir = ensure_reports_directory()
    pdf_filename = f"traffic_report_{timestamp_str}.pdf"
    pdf_path = os.path.join(reports_dir, pdf_filename)
    latest_json_path = os.path.join(reports_dir, "latest_report.json")
    chart_image_path = os.path.join(reports_dir, f"chart_{timestamp_str}.png")

    # 1. Fetch raw data
    locations_data, recent_traffic, recent_alerts = fetch_report_data()

    # 2. Compute metrics
    summary = process_report_metrics(locations_data, recent_traffic, recent_alerts)

    report_payload = {
        "report_id": str(uuid.uuid4()),
        "report_title": "Traffic Prediction & Congestion Executive Report",
        "generated_at": iso_now,
        "pdf_filename": pdf_filename,
        "summary": summary
    }

    # 3. Generate Chart Image
    generated_chart_path = generate_chart_image(summary['congestion_breakdown'], chart_image_path)

    # 4. Generate PDF Report
    pdf_file_result = generate_pdf_report(report_payload, pdf_path, generated_chart_path)

    # Clean up temporary chart file if created
    if generated_chart_path and os.path.exists(generated_chart_path):
        try:
            os.remove(generated_chart_path)
        except Exception:
            pass

    # 5. Save latest_report.json
    with open(latest_json_path, 'w', encoding='utf-8') as f:
        json.dump(report_payload, f, indent=2)

    # Also keep a copy as latest_report.pdf if PDF was generated
    if pdf_file_result and os.path.exists(pdf_path):
        latest_pdf_path = os.path.join(reports_dir, "latest_report.pdf")
        with open(pdf_path, 'rb') as src, open(latest_pdf_path, 'wb') as dst:
            dst.write(src.read())

    # 6. Persist to Database
    db_report_id = persist_report_to_db(report_payload, pdf_filename)
    report_payload["report_id"] = db_report_id

    # Print clean json summary to stdout for calling processes
    print(json.dumps({
        "success": True,
        "message": "Traffic report generated successfully",
        "report_id": db_report_id,
        "pdf_filename": pdf_filename,
        "latest_json_path": latest_json_path,
        "generated_at": iso_now
    }))


if __name__ == "__main__":
    try:
        generate_report()
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }), file=sys.stderr)
        sys.exit(1)
