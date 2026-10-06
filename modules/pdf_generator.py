from fpdf import FPDF
from datetime import datetime

def clean_txt(val) -> str:
    """Evita errors d'encoding latin-1 amb caràcters especials."""
    if val is None:
        return ""
    return str(val).replace("€", "EUR").replace("’", "'").encode("latin-1", "replace").decode("latin-1")

class OptiFundsReport(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(5, 150, 105) # Emerald 600
        self.cell(0, 8, "OPTIFUNDS ANALYTICS | INFORME D'AUDITORIA FIDUCIARIA", border=False, ln=True, align="L")
        self.set_draw_color(226, 232, 240) # Slate 200
        self.line(10, 18, 200, 18)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Generat el {datetime.now().strftime('%d/%m/%Y %H:%M')} | Document confidencial d'analitica de carteres", align="C")

def generate_fund_360_pdf(data: dict) -> bytes:
    pdf = OptiFundsReport()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    profile = data.get("profile", {})
    perf = data.get("performance", {})
    closet = data.get("closet_audit", {})
    holdings = data.get("holdings", [])
    alts = data.get("alternatives", [])

    # Capçalera del fons
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 8, clean_txt(profile.get("name", "Sense Nom")[:50]), ln=True)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 116, 139)
    meta = f"ISIN: {profile.get('isin', '-')}  |  Categoria: {profile.get('category', 'Renda Variable')}  |  Divisa: {profile.get('currency', 'EUR')}"
    pdf.cell(0, 5, clean_txt(meta), ln=True)
    pdf.ln(4)

    # Taula 1: Costos i Mètriques de Rendibilitat
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(248, 250, 252)
    pdf.set_text_color(71, 85, 105)
    
    headers_kpi = ["TER Oficial", "Retorn 1A", "Retorn 3A", "Retorn 5A", "Volatilitat (3Y)", "Sharpe (3Y)"]
    for h in headers_kpi:
        pdf.cell(31.6, 6, clean_txt(h), border=1, fill=True, align="C")
    pdf.ln(6)

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(15, 23, 42)
    
    ter_txt = f"{float(profile.get('ter', 0)):.2f}%"
    r1_txt = f"{perf.get('ret_1y', 0):.1f}%" if perf.get('ret_1y') is not None else "N/D"
    r3_txt = f"{perf.get('ret_3y', 0):.1f}%" if perf.get('ret_3y') is not None else "N/D"
    r5_txt = f"{perf.get('ret_5y', 0):.1f}%" if perf.get('ret_5y') is not None else "N/D"
    vol_txt = f"{perf.get('volatility', 0):.1f}%" if perf.get('volatility') is not None else "N/D"
    sh_txt = f"{perf.get('sharpe', 0):.2f}" if perf.get('sharpe') is not None else "N/D"

    pdf.cell(31.6, 7, ter_txt, border=1, align="C")
    pdf.cell(31.6, 7, r1_txt, border=1, align="C")
    pdf.cell(31.6, 7, r3_txt, border=1, align="C")
    pdf.cell(31.6, 7, r5_txt, border=1, align="C")
    pdf.cell(31.6, 7, vol_txt, border=1, align="C")
    pdf.cell(31.6, 7, sh_txt, border=1, align="C")
    pdf.ln(10)

    # Bloc 2: Auditoria de Closet Indexing
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 6, "1. Dictamen d'Auditoria: Active Share & Closet Indexing", ln=True)
    pdf.ln(1.5)

    is_closet = closet.get("is_closet", False)
    as_pct = float(closet.get("active_share", 85.0))
    ov_pct = float(closet.get("overlap", 15.0))
    act_ter = float(closet.get("active_ter", profile.get("ter", 1.5)))

    if is_closet:
        pdf.set_fill_color(254, 242, 242)
        pdf.set_text_color(185, 28, 28)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 7, "  ALERTA: EVIDENCIA DE CLOSET INDEXING DETECTADA", border=1, fill=True, ln=True)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(51, 65, 85)
        txt = (
            f"El vehicle comparteix un {ov_pct:.1f}% de la seva composicio amb el benchmark ({closet.get('benchmark_name', 'Index')}). "
            f"El cost real cobrat per la fraccio de capital autenticament gestionada s'eleva al {act_ter:.2f}% anual, "
            "desaconsellant la seva contractacio respecte a un indexat directe."
        )
    else:
        pdf.set_fill_color(240, 253, 244)
        pdf.set_text_color(21, 128, 61)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 7, "  DICTAMEN: GESTIO ACTIVA AUTENTICA CONFIRMADA", border=1, fill=True, ln=True)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(51, 65, 85)
        txt = (
            f"Active Share del {as_pct:.1f}%. El fons demostra un alt grau de seleccio lliure i desmarcatge respecte a "
            f"l'index de referencia ({closet.get('benchmark_name', 'Benchmark')})."
        )
    pdf.multi_cell(0, 5, clean_txt(txt), border=1)
    pdf.ln(5)

    # Bloc 3: Top Holdings
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 6, "2. Radiografia Subjacent de la Cartera (Look-Through)", ln=True)
    pdf.ln(1.5)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(248, 250, 252)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(110, 6, "  Titol / Companyia", border=1, fill=True)
    pdf.cell(40, 6, "RIC", border=1, fill=True, align="C")
    pdf.cell(40, 6, "Pes en Cartera", border=1, fill=True, align="R")
    pdf.ln(6)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(15, 23, 42)
    top_holdings = holdings[:8]
    if top_holdings:
        for h in top_holdings:
            pdf.cell(110, 5.5, f"  {clean_txt(h.get('name', 'N/D')[:40])}", border=1)
            pdf.cell(40, 5.5, clean_txt(h.get('ric', '-')), border=1, align="C")
            pdf.cell(40, 5.5, f"{float(h.get('weight', 0)):.2f}%", border=1, align="R")
            pdf.ln(5.5)
    else:
        pdf.cell(190, 6, "  Sense desglossament disponible", border=1, align="L", ln=True)
    pdf.ln(5)

    # Bloc 4: Alternatives Indexades
    if alts:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 6, "3. Alternatives de Baix Cost Identificades (Smart Switch)", ln=True)
        pdf.ln(1.5)

        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(248, 250, 252)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(90, 6, "  Alternativa Proposada", border=1, fill=True)
        pdf.cell(35, 6, "ISIN", border=1, fill=True, align="C")
        pdf.cell(30, 6, "Solapament", border=1, fill=True, align="C")
        pdf.cell(35, 6, "Estalvi Anual TER", border=1, fill=True, align="R")
        pdf.ln(6)

        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(15, 23, 42)
        for a in alts[:3]:
            pdf.cell(90, 5.5, f"  {clean_txt(a.get('cand_name', '-')[:35])}", border=1)
            pdf.cell(35, 5.5, clean_txt(a.get('cand_isin', '-')), border=1, align="C")
            pdf.cell(30, 5.5, f"{float(a.get('overlap', 0)):.0f}%", border=1, align="C")
            pdf.cell(35, 5.5, f"-{float(a.get('ter_savings', 0)):.2f}%/any", border=1, align="R")
            pdf.ln(5.5)
        pdf.ln(4)

    # Clàusula legal MiFID II
    pdf.set_font("Helvetica", "I", 6.5)
    pdf.set_text_color(148, 163, 184)
    disclaimer = (
        "Aquest document ha estat emes per la plataforma tecnologica OptiFunds amb caracter purament estadistic i analitic. "
        "No constitueix cap oferta, recomanacio d'inversio ni assessorament financer individualitzat segons la directiva MiFID II. "
        "Rendibilitats passades no garanteixen retorns futurs."
    )
    pdf.multi_cell(0, 3.5, clean_txt(disclaimer))

    return bytes(pdf.output())
