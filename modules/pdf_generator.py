from fpdf import FPDF
from datetime import datetime

class ExecutiveReport(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(13, 148, 136) # Teal
        self.cell(0, 10, "OPTIFUNDS ANALYTICS | INFORME D'AUDITORIA", border=False, ln=True, align="L")
        self.set_draw_color(203, 213, 225)
        self.line(10, 22, 200, 22)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Generat el {datetime.now().strftime('%d/%m/%Y %H:%M')} | Document confidencial d'ús analític", align="C")

def build_closet_indexing_pdf(fund_name, bmk_name, isin_fund, isin_bmk, overlap, active_share, ter_fund, ter_actiu, is_closet):
    pdf = ExecutiveReport()
    pdf.add_page()
    pdf.ln(5)

    # Títol
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 8, "Dictamen d'Auditoria: Active Share & Closet Indexing", ln=True)
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 6, "Avaluació d'independència gestora i cost efectiu del capital actiu", ln=True)
    pdf.ln(6)

    # Taula descriptiva
    pdf.set_fill_color(248, 250, 252)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(95, 8, "  Fons Auditat", border=1, fill=True)
    pdf.cell(95, 8, "  Benchmark de Referència", border=1, fill=True, ln=True)

    pdf.set_font("Helvetica", "", 9)
    pdf.cell(95, 8, f"  {fund_name[:45]}", border=1)
    pdf.cell(95, 8, f"  {bmk_name[:45]}", border=1, ln=True)

    pdf.cell(95, 7, f"  ISIN: {isin_fund}", border=1)
    pdf.cell(95, 7, f"  ISIN: {isin_bmk}", border=1, ln=True)
    pdf.ln(8)

    # Resultats quantitatius
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Mètriques Quantitatives Determinants", ln=True)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(241, 245, 249)
    pdf.cell(47, 8, "Solapament (Overlap)", border=1, fill=True, align="C")
    pdf.cell(47, 8, "Active Share Pur", border=1, fill=True, align="C")
    pdf.cell(47, 8, "TER Contractual", border=1, fill=True, align="C")
    pdf.cell(49, 8, "TER Efectiu Actiu", border=1, fill=True, align="C", ln=True)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(47, 10, f"{overlap:.1f} %", border=1, align="C")
    pdf.cell(47, 10, f"{active_share:.1f} %", border=1, align="C")
    pdf.cell(47, 10, f"{ter_fund:.2f} %", border=1, align="C")
    pdf.cell(49, 10, f"{ter_actiu:.2f} %", border=1, align="C", ln=True)
    pdf.ln(8)

    # Caixa de diagnòstic
    pdf.set_font("Helvetica", "B", 11)
    if is_closet:
        pdf.set_fill_color(254, 242, 242)
        pdf.set_text_color(185, 28, 28)
        pdf.cell(0, 10, "  AVÍS: EVIDÈNCIA DE CLOSET INDEXING DETECTADA", border=1, fill=True, ln=True)
        pdf.set_font("Helvetica", "", 9)
        txt = (
            f"El fons replica substancialment l'índex amb un solapament del {overlap:.1f}%.\n"
            f"El client està assumint un sobrecost ocult: la fracció de capital autènticament "
            f"gestionada té un cost real anualitzat del {ter_actiu:.2f}%, desaconsellant la seva tinença davant un vehicle indexat pur."
        )
    else:
        pdf.set_fill_color(240, 253, 244)
        pdf.set_text_color(21, 128, 61)
        pdf.cell(0, 10, "  DICTAMEN: GESTIÓ ACTIVA DIFERENCIAL CONFIRMADA", border=1, fill=True, ln=True)
        pdf.set_font("Helvetica", "", 9)
        txt = (
            f"El fons demostra independència de criteri amb un Active Share del {active_share:.1f}%.\n"
            f"La desviació respecte a l'índex justifica l'aplicació d'una comissió de gestió d'autor."
        )

    pdf.multi_cell(0, 6, txt, border=1)
    pdf.ln(10)

    # Clàusula de compliment normatiu
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(148, 163, 184)
    disclaimer = (
        "Aquest document ha estat emès per la plataforma tecnològica OptiFunds amb caràcter purament analític i estadístic. "
        "No constitueix cap oferta, recomanació d'inversió ni assessorament financer individualitzat segons la directiva MiFID II. "
        "Rendibilitats passades no garanteixen retorns futurs."
    )
    pdf.multi_cell(0, 4, disclaimer)

    return bytes(pdf.output())
