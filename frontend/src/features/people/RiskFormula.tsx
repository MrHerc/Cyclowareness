/**
 * The definition of a risk score, in the fewest words that are still true.
 *
 * This is the only block on the people screens with no data in it, and that is
 * deliberate: everything else on this page is an instance of what is stated
 * here, and a reader who does not accept this paragraph has no reason to accept
 * any of the numbers underneath it.
 */

export function RiskFormula() {
  return (
    <div className="space-y-4">
      <p className="text-body text-fg-muted">
        A risk score is one number between 0 and 100 describing how likely this person is to be the
        point where an attack succeeds. It is not a performance rating and it is not an opinion — it
        is a starting point set by their role, plus every signal the platform has recorded about
        them.
      </p>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-control border border-line-subtle bg-base p-4">
          <dt className="label text-fg-subtle">The baseline</dt>
          <dd className="tech mt-2 text-fg">baseline = 20 + role_sensitivity × 20</dd>
          <dd className="mt-2 text-sm text-fg-muted">
            Role sensitivity runs from 0 to 1 and describes how much damage this seat could do if it
            were used against the company. A finance approver starts higher than a warehouse
            operator, before either of them has done anything at all.
          </dd>
        </div>

        <div className="rounded-control border border-line-subtle bg-base p-4">
          <dt className="label text-fg-subtle">The score</dt>
          <dd className="tech mt-2 text-fg">score = baseline + Σ(event deltas)</dd>
          <dd className="mt-2 text-sm text-fg-muted">
            Every signal is a stored event with a weight, a written reason and a timestamp. Nothing
            else moves the number, which is why any score on this deployment can be added up by hand
            from the events behind it.
          </dd>
        </div>
      </dl>

      <ul className="space-y-2 text-sm text-fg-muted">
        <li>
          <span className="text-fg">Clamped to 0–100.</span> The engine stores the delta it actually
          applied rather than the one the weight asked for, so a score sitting at the rail still
          reconciles against its events instead of quietly drifting away from them.
        </li>
        <li>
          <span className="text-fg">Withdrawable.</span> Events can be revoked as a batch and the
          score recomputed from what remains. A number nobody can withdraw is a number nobody should
          trust.
        </li>
        <li>
          <span className="text-fg">Being attacked is not a mark against you.</span> Having a threat
          reach you is recorded at weight zero. It explains why you were selected for training; it
          cannot raise your score, because otherwise anyone outside the company could raise it for
          you by sending mail.
        </li>
        <li>
          <span className="text-fg">Reporting lowers it.</span> The person who reports is the sensor,
          not the failure, and the targeting stage drops the reporter unless something else
          independently flagged them.
        </li>
      </ul>
    </div>
  )
}
