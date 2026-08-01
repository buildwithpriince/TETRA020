import { motion } from 'framer-motion';
import { ShieldCheck, Lock, FileCheck2, Eye } from 'lucide-react';
import { AnnotatedDocumentCard } from '@/components/hero/AnnotatedDocumentCard';
import { PipelineLedger } from '@/components/pipeline/PipelineLedger';
import { ArrowLink } from '@/components/shared/ArrowLink';
import { MonoNumber } from '@/components/shared/MonoNumber';
import { PageTransition } from '@/components/layout/PageTransition';

const stats = [
  { value: 5, suffix: '', label: 'Document types cross-referenced' },
  { value: 7, suffix: '', label: 'Analysis stages, fully automated' },
  { value: 100, suffix: '%', label: 'Confidence shown on every figure' },
];

const stages = [
  {
    title: 'Ingest & classify',
    description: 'Drag in the pitch deck, MIS, financials, projections, and cap table. Prism detects each document type automatically and flags anything missing.',
    detail: <span className="font-mono text-[11px] text-ink-muted">PDF · PPTX · XLSX · CSV</span>,
  },
  {
    title: 'Extract figures & text',
    description: 'Every number is pulled from its source — including values embedded in charts — with a confidence score attached and a precise source reference.',
    detail: <span className="font-mono text-[11px] text-ink-muted">OCR + vision extraction · per-figure confidence</span>,
  },
  {
    title: 'Normalize & align',
    description: 'Currencies are converted, fiscal calendars aligned, and unit scales reconciled — each conversion noted so you can trust the comparison.',
    detail: <span className="font-mono text-[11px] text-ink-muted">₹ lakhs → Cr · FY → CY · synonym mapping</span>,
  },
  {
    title: 'Cross-reference metrics',
    description: 'The same metric is traced across every document. Matching figures get a green tick; mismatches get a red flag — the auditor’s red pen, digitized.',
    detail: <span className="font-mono text-[11px] text-ink-muted">Document × metric matrix · tri-state tagging</span>,
  },
  {
    title: 'Score materiality & confidence',
    description: 'Each discrepancy is classified as a rounding error, a material mismatch, or a critical red flag. Low-confidence extractions are singled out for manual review.',
    detail: <span className="font-mono text-[11px] text-ink-muted">Adjustable tolerance · confidence-weighted</span>,
  },
  {
    title: 'Generate diligence questions',
    description: 'Prism drafts investor-style follow-up questions for every gap — ranked by materiality, each linking back to the exact matrix cell it concerns.',
    detail: <span className="font-mono text-[11px] text-ink-muted">Most material first · one click to source</span>,
  },
];

export default function Overview() {
  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-ledger items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:py-24">
          {/* left: copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-tint px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-redink" />
              Cross-document consistency checker
            </span>
            <h1 className="mt-5 font-display text-[44px] font-semibold leading-[1.05] tracking-tight text-ink text-balance lg:text-[56px]">
              The numbers should
              <br />
              <span className="text-redink">add up.</span> Check them
              <br />
              before the call.
            </h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-ink-soft">
              Prism cross-references a startup’s fundraising documents — pitch deck, MIS,
              financials, projections, cap table — and flags where the story doesn’t hold
              together. An auditor’s red pen, built for diligence.
            </p>
            <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-muted">
              Prism checks consistency and completeness only — it does not value the company
              or give investment advice.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <ArrowLink to="/upload" variant="red">
                Run a diligence check
              </ArrowLink>
              <ArrowLink to="/dashboard" variant="muted">
                View sample report
              </ArrowLink>
            </div>
          </motion.div>

          {/* right: annotated card */}
          <div className="relative lg:pl-4">
            <AnnotatedDocumentCard />
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-rule bg-paper-shade">
        <div className="mx-auto grid max-w-ledger grid-cols-1 divide-y divide-rule px-5 py-10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex flex-col items-center px-6 py-4 text-center sm:py-0"
            >
              <MonoNumber
                value={s.value}
                suffix={s.suffix}
                className="font-display text-[40px] font-semibold text-ink"
              />
              <p className="mt-1 max-w-[200px] text-[13px] leading-snug text-ink-muted">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pipeline / ledger explainer */}
      <section className="mx-auto max-w-ledger px-5 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              The ledger
            </span>
            <h2 className="mt-2 font-display text-[34px] font-semibold leading-tight text-ink text-balance">
              From upload to flagged report, one stage at a time.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Each stage stamps its tick mark as it completes. The connecting rule fills in
              like a running tally — so you can see exactly how far the audit has progressed.
            </p>
          </div>
          <PipelineLedger stages={stages} />
        </div>
      </section>

      {/* Trust section */}
      <section className="border-t border-rule bg-paper-shade">
        <div className="mx-auto max-w-ledger px-5 py-20 lg:px-8">
          <div className="max-w-2xl">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              How we handle your files
            </span>
            <h2 className="mt-2 font-display text-[30px] font-semibold leading-tight text-ink">
              Documents are processed for the check, then not kept.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              Prism ingests documents only long enough to extract and cross-reference the
              figures. No permanent document storage, no training on your data.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: 'No permanent storage', body: 'Documents are processed for the analysis and not retained after the session.' },
              { icon: Lock, title: 'Google sign-in, identity only', body: 'We use your Google identity to identify who is running a session — nothing more.' },
              { icon: FileCheck2, title: 'Extraction transparency', body: 'Every figure carries a confidence score and a source reference you can trace.' },
              { icon: Eye, title: 'Not investment advice', body: 'Prism assesses consistency and completeness. It does not value companies or advise.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="rounded-lg border border-rule bg-paper-tint p-5"
              >
                <item.icon size={22} className="text-ink" />
                <h3 className="mt-3 font-display text-[16px] font-medium text-ink">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-ledger px-5 py-20 text-center lg:px-8">
        <h2 className="font-display text-[32px] font-semibold text-ink text-balance">
          Ready to run the numbers?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-muted">
          Upload a startup’s documents and get a flagged consistency report in minutes.
        </p>
        <div className="mt-6 flex justify-center">
          <ArrowLink to="/upload" variant="red">
            Start a diligence check
          </ArrowLink>
        </div>
      </section>
    </PageTransition>
  );
}
