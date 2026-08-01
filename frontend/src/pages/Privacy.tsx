import { PageTransition } from '@/components/layout/PageTransition';

export default function Privacy() {
  return (
    <PageTransition>
      <article className="mx-auto max-w-prose px-5 py-16 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Legal</p>
        <h1 className="mt-2 font-display text-[40px] font-semibold leading-tight text-ink">
          Privacy Policy
        </h1>
        <p className="mt-3 font-mono text-[12px] text-ink-muted">Last updated: August 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink-soft">
          <Section title="What we collect">
            <p>
              When you use Prism, we process the fundraising documents you upload (pitch deck,
              MIS, financial statements, projections, cap table) solely to extract financial
              figures and cross-reference them for consistency. We also receive your email
              address and display name from Google Sign-In to identify who is running a session.
            </p>
            <p className="mt-3">
              We do not collect demographic data, browsing history, or contact lists. No
              account profile information is stored beyond your Google identity for the
              duration of a session.
            </p>
          </Section>

          <Section title="No permanent document storage">
            <p>
              Documents are ingested only long enough to perform the consistency analysis.
              Prism does not maintain a permanent archive of your uploaded files. Once the
              analysis session is concluded or you sign out, the extracted data associated with
              that session is no longer retained on our servers.
            </p>
          </Section>

          <Section title="Google sign-in usage">
            <p>
              We use Firebase Authentication with the Google provider to verify your identity.
              This is used solely to identify who is running a diligence session. Your Google
              identity is not tied to the content of the documents you upload, and we do not
              access your Google Drive, Gmail, or any other Google service data.
            </p>
          </Section>

          <Section title="Gemini API data-handling">
            <p>
              Prism uses the Gemini API to assist with figure extraction, document
              classification, and reasoning about discrepancies. Document text and extracted
              figures are sent to the Gemini API for processing during the analysis. We do not
              use your data to train any models. Processing through the Gemini API is governed
              by Google’s applicable API data-handling terms.
            </p>
          </Section>

          <Section title="Hackathon-prototype disclaimer">
            <p>
              Prism is a hackathon prototype. It is provided for demonstration and educational
              purposes only. The analysis it produces may contain errors, and no guarantee is
              made regarding the accuracy or completeness of extracted figures or flagged
              discrepancies. Always verify results independently before relying on them.
            </p>
          </Section>

          <Section title="Not investment advice">
            <p>
              Prism checks the consistency and completeness of fundraising documents. It does
              not value any company, assess the merits of an investment, or provide investment
              advice. Any investment decision is solely your responsibility. Nothing output by
              Prism should be interpreted as a recommendation to buy, sell, or hold any
              security or interest in a company.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy can be directed to the Prism team through the
              project’s standard support channels.
            </p>
          </Section>
        </div>
      </article>
    </PageTransition>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[20px] font-medium text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
