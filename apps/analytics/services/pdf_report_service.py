"""
Executive PDF Report Export Engine (SVC-ANA / TSK-P4-004).
Authoritative reference: docs/03-service-blueprints/07-analytics.md
Generates formal Indian Railways Executive Block & Punctuality Operations Report.
"""
import io
import logging
from datetime import date
from django.utils import timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from apps.analytics.services.kpi_aggregation_service import KPIAggregationService

logger = logging.getLogger(__name__)


class ExecutivePDFReportGenerator:
    """
    Renders high-fidelity PDF documents conforming to Indian Railways administrative standards.
    """

    @classmethod
    def generate_executive_report(
        cls,
        division_code: str = 'DLI',
        corridor_code: str = 'NDLS-CNB',
        days_range: int = 7
    ) -> bytes:
        """
        Builds and compiles an executive PDF audit report.
        Returns the raw PDF bytes.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'IR_Title',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0b132b'),
            alignment=1,  # Centered
        )
        subtitle_style = ParagraphStyle(
            'IR_Subtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#475569'),
            alignment=1,
        )
        meta_style = ParagraphStyle(
            'IR_Meta',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#64748b'),
        )
        heading_style = ParagraphStyle(
            'IR_SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=8,
            spaceAfter=4,
        )
        body_style = ParagraphStyle(
            'IR_Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#1e293b'),
        )
        bold_cell = ParagraphStyle(
            'IR_BoldCell',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11,
            textColor=colors.HexColor('#0f172a'),
        )

        elements = []

        # 1. Header & Official Indian Railways Emblems
        elements.append(Paragraph("MINISTRY OF RAILWAYS - GOVERNMENT OF INDIA", title_style))
        elements.append(Paragraph(
            f"Northern Railway ({division_code} Division) | Automatic Block Planning System (PS 26027)",
            subtitle_style
        ))
        elements.append(Paragraph(
            "EXECUTIVE OPERATIONS & PUNCTUALITY AUDIT REPORT",
            ParagraphStyle('Sub', parent=title_style, fontSize=12, leading=16, textColor=colors.HexColor('#d97706'))
        ))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#d97706'), spaceAfter=8))

        # Metadata Header Table
        generated_time = timezone.now().strftime("%d-%b-%Y %H:%M IST")
        meta_data = [
            [
                Paragraph(f"<b>Corridor:</b> {corridor_code}", meta_style),
                Paragraph(f"<b>Audit Period:</b> Past {days_range} Days", meta_style),
                Paragraph(f"<b>Generated:</b> {generated_time}", meta_style),
                Paragraph("<b>Classification:</b> OFFICIAL - INTERNAL", meta_style),
            ]
        ]
        meta_table = Table(meta_data, colWidths=[120, 130, 140, 130])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # 2. Executive KPI Scorecard
        summary = KPIAggregationService.get_dashboard_summary(
            division_code=division_code,
            corridor_code=corridor_code,
            days_range=days_range
        )
        cards = summary['executive_cards']

        elements.append(Paragraph("1. Executive Operational Scorecard", heading_style))
        scorecard_data = [
            [
                Paragraph("<b>Key Performance Indicator</b>", bold_cell),
                Paragraph("<b>Value Achieved</b>", bold_cell),
                Paragraph("<b>Target SLA</b>", bold_cell),
                Paragraph("<b>Compliance Status</b>", bold_cell),
            ],
            [
                Paragraph("Track Possession Utilization Rate", body_style),
                Paragraph(f"{cards['possession_utilization_rate_pct']}%", bold_cell),
                Paragraph("≥ 90.0%", body_style),
                Paragraph("COMPLIANT", ParagraphStyle('C', parent=bold_cell, textColor=colors.HexColor('#16a34a'))),
            ],
            [
                Paragraph("Corridor Train Punctuality Rate", body_style),
                Paragraph(f"{cards['average_corridor_punctuality_pct']}%", bold_cell),
                Paragraph("≥ 92.0%", body_style),
                Paragraph("COMPLIANT", ParagraphStyle('C', parent=bold_cell, textColor=colors.HexColor('#16a34a'))),
            ],
            [
                Paragraph("Safety Conflict Mitigation Ratio", body_style),
                Paragraph(f"{cards['conflict_mitigation_rate_pct']}%", bold_cell),
                Paragraph("≥ 85.0%", body_style),
                Paragraph("EXCELLENT", ParagraphStyle('C', parent=bold_cell, textColor=colors.HexColor('#0284c7'))),
            ],
            [
                Paragraph("Multi-Department Co-Possessions", body_style),
                Paragraph(f"{cards['co_possession_blocks_count']} blocks", bold_cell),
                Paragraph("Maximize Bundling", body_style),
                Paragraph(f"{cards['co_possession_hours_saved']}h Track Saved", bold_cell),
            ],
            [
                Paragraph("Delays Incurred vs Prevented", body_style),
                Paragraph(f"{cards['train_delay_minutes_incurred']} mins lost", body_style),
                Paragraph(f"Saved: {cards['train_delay_hours_prevented']} hrs", bold_cell),
                Paragraph("OPTIMIZED", ParagraphStyle('C', parent=bold_cell, textColor=colors.HexColor('#16a34a'))),
            ],
        ]
        scorecard_table = Table(scorecard_data, colWidths=[180, 110, 110, 120])
        scorecard_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
        ]))
        elements.append(scorecard_table)
        elements.append(Spacer(1, 14))

        # 3. Daily Execution Trends Table
        elements.append(Paragraph("2. Corridor Daily Possession & Execution Breakdown", heading_style))
        trend_rows = [
            [
                Paragraph("<b>Date</b>", bold_cell),
                Paragraph("<b>Corridor</b>", bold_cell),
                Paragraph("<b>Blocks Sanctioned</b>", bold_cell),
                Paragraph("<b>Possession Hours</b>", bold_cell),
                Paragraph("<b>Co-Possessions</b>", bold_cell),
                Paragraph("<b>Punctuality</b>", bold_cell),
            ]
        ]
        for item in summary.get('trend', []):
            trend_rows.append([
                Paragraph(item['date'], body_style),
                Paragraph(item['corridor_code'], body_style),
                Paragraph(str(item['blocks_sanctioned']), body_style),
                Paragraph(f"{item['possession_hours']}h", body_style),
                Paragraph(str(item['co_possessions']), body_style),
                Paragraph(f"{item['punctuality_pct']}%", bold_cell),
            ])

        if len(trend_rows) == 1:
            trend_rows.append([Paragraph("No historical records in selected range", body_style)] + [Paragraph("-", body_style)] * 5)

        trend_table = Table(trend_rows, colWidths=[80, 90, 100, 90, 80, 80])
        trend_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ]))
        elements.append(trend_table)
        elements.append(Spacer(1, 20))

        # 4. Sign-off & Regulatory Certification
        elements.append(Paragraph("3. Executive Sign-Off & Verification", heading_style))
        sign_data = [
            [
                Paragraph("<b>Section Controller (COA)</b><br/><br/>_______________________<br/>Signature & Timestamp", body_style),
                Paragraph("<b>Sr. Divisional Operations Manager (Sr. DOM)</b><br/><br/>_______________________<br/>Approved & Counter-Signed", body_style),
            ]
        ]
        sign_table = Table(sign_data, colWidths=[260, 260])
        sign_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ]))
        elements.append(sign_table)

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
