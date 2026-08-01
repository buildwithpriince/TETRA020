import { PageTransition } from '@/components/layout/PageTransition';

export default function Terms() {
  return (
    <PageTransition>
      <article className="mx-auto max-w-prose px-5 py-16 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Legal</p>
        <h1 className="mt-2 font-display text-[40px] font-semibold leading-tight text-ink">
          Terms &amp; Conditions
        </h1>
        <p className="mt-3 font-mono text-[12px] text-ink-muted">Last updated: August 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink-soft">
          <Section title="Acceptable use">
            <p>
              By using Prism, you agree to use the service only for its intended purpose:
              checking the consistency and completeness of fundraising documents during
              investment diligence. You agree not to upload documents you do not have the right
              to process, and not to use the service for any unlawful purpose.
            </p>
            <p className="mt-3">
              You are responsible for the documents you upload and for ensuring that their
              processing through Prism complies with any confidentiality or non-disclosure
              obligations you may have.
            </p>
          </Section>

          <Section title="No warranty of accuracy">
            <p>
              Prism is provided “as is” without any warranty of accuracy, reliability, or
              fitness for a particular purpose. The tool extracts figures using automated
              methods — including optical character recognition and vision-based chart reading —
              that may produce errors. Confidence scores are provided as indicators only and do
              not constitute guarantees.
            </p>
            <p className="mt-3">
              You should independently verify any figure, discrepancy, or conclusion surfaced by
              Prism before acting on it.
            </p>
          </Section>

          <Section title="Not investment advice">
            <p>
              Prism does not value companies, assess investment merit, or provide investment
              advice. The outputs of the service are consistency and completeness checks only.
              Nothing here constitutes a recommendation to invest, not invest, or take any
              other financial action.
            </p>
          </Section>

          <Section title="Intellectual property">
            <p>
              The Prism name, logo, and software are the intellectual property of their
              respective owners. You retain all rights to the documents you upload. Prism
              claims no ownership over your uploaded content.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              To the fullest extent permitted by law, the creators of Prism shall not be liable
              for any direct, indirect, incidental, or consequential damages arising from the
              use of, or inability to use, the service — including any investment decisions
              made in reliance on its output.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              These terms may be updated from time to time. Continued use of Prism after
              changes constitutes acceptance of the revised terms.
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
