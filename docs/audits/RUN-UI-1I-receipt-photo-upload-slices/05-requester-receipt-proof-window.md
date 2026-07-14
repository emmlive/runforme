# Window slice: frontend/src/Dashboard.jsx


---

214:         </div>
215: 
216:         <div style={{ padding: 12, background: "#f8fafc", borderRadius: 12 }}>
217:           <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
218:             Assigned Runner
219:           </div>
220:           <div style={{ marginTop: 4, fontWeight: 800 }}>
221:             {run.assignedRunnerId ? `Runner #${run.assignedRunnerId}` : "Not assigned yet"}
222:           </div>
223:         </div>
224: 
225:         <div style={{ padding: 12, background: "#f8fafc", borderRadius: 12 }}>
226:           <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Payment</div>
227:           <div style={{ marginTop: 4, fontWeight: 800 }}>{paymentText}</div>
228:         </div>
229: 
230:         <div style={{ padding: 12, background: "#f8fafc", borderRadius: 12 }}>
231:           <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Created</div>
232:           <div style={{ marginTop: 4, fontWeight: 800 }}>{formatDate(run.createdAt)}</div>
233:         </div>
234:       </div>
235:     </div>
236:   );
237: }
238: 
239: 
240: function getNextStep(status) {
241:   if (status === "open") return "Waiting for a runner to accept this run.";
242:   if (status === "assigned") return "Runner assigned. Next step: runner arrival.";
243:   if (status === "arrived") return "Runner has arrived. Next step: completion.";
244:   if (status === "in_progress") return "Run is in progress.";
245:   if (status === "completed") return "Run completed. Review payment and history.";
246:   return "Monitoring run status.";
247: }
248: 
249: 
250: function SecurityProofGrid({ run }) {
251:   const isMobile = useIsMobile();
252: 
253:   const items = [
254:     ["Delivery PIN", run.deliveryPin || "Not generated"],
255:     ["Authorization", formatSecurityStatus(run.authorizationStatus)],
256:     ["Hold Amount", formatMoney(run.holdAmount)],
257:     ["Max Runner Spend", formatMoney(run.maxRunnerSpend)],
258:     ["Purchase Status", formatSecurityStatus(run.purchaseStatus)],
259:     ["Receipt Status", formatSecurityStatus(run.receiptStatus)],
260:     [
261:       "Receipt Amount",
262:       Number(run.receiptAmount || 0) > 0 ? formatMoney(run.receiptAmount) : "Not submitted",
263:     ],
264:     [
265:       "Final Amount",
266:       Number(run.finalAmount || 0) > 0 ? formatMoney(run.finalAmount) : "Not calculated",
267:     ],
268:     ["Receipt Proof", run.receiptImageUrl ? "Uploaded" : "Not uploaded"],
269:     ["Payout Status", formatSecurityStatus(run.payoutStatus)],
270:     ["Delivery Confirmed", formatDate(run.deliveryConfirmedAt)],
271:     ["Manual Review", run.requiresManualReview ? "Required" : "Not required"],
272:   ];
273: 
274:   return (
275:     <div
276:       style={{
277:         marginTop: 18,
278:         padding: 16,
279:         borderRadius: 16,
280:         background: "rgba(255,255,255,0.07)",
281:         border: "1px solid rgba(255,255,255,0.12)",
282:       }}
283:     >
284:       <div className="run-requester-heading run-requester-heading--security run-requester-surface run-requester-surface--security"
285:         style={{
286:           color: "#bfdbfe",
287:           fontSize: 12,
288:           fontWeight: 900,
289:           letterSpacing: 1.3,
290:           marginBottom: 12,
291:         }}
292:       >
293:         SECURITY & PROOF
294:       </div>
295: 
296:       <div
297:         style={{
298:           display: "grid",
299:           gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
300:           gap: 10,
301:         }}
302:       >
303:         {items.map(([label, value]) => (
304:           <div
305:             key={label}
306:             style={{
307:               background: "rgba(15,23,42,0.38)",
308:               borderRadius: 12,
309:               padding: 12,
310:             }}
311:           >
312:             <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>
313:               {label}
314:             </div>
315:             <div
316:               style={{

---

522:             style={{
523:               border: "1px solid rgba(148,163,184,0.45)",
524:               background:
525:                 run.authorizationStatus === "placeholder_authorized"
526:                   ? "rgba(34,197,94,0.20)"
527:                   : authorizingHold
528:                     ? "rgba(148,163,184,0.18)"
529:                     : "#22c55e",
530:               color:
531:                 run.authorizationStatus === "placeholder_authorized"
532:                   ? "#bbf7d0"
533:                   : authorizingHold
534:                     ? "#cbd5e1"
535:                     : "#052e16",
536:               borderRadius: 10,
537:               padding: "10px 14px",
538:               cursor:
539:                 authorizingHold ||
540:                 run.authorizationStatus === "placeholder_authorized"
541:                   ? "not-allowed"
542:                   : "pointer",
543:               fontWeight: 900,
544:             }}
545:           >
546:             {run.authorizationStatus === "placeholder_authorized"
547:               ? "Secure Hold Placeholder Authorized"
548:               : authorizingHold
549:                 ? "Authorizing..."
550:                 : "Authorize Secure Hold"}
551:           </button>
552:         </div>
553:       )}
554: 
555:       {run.requiresManualReview && (
556:         <div
557:           style={{
558:             marginTop: 18,
559:             background: "rgba(251,191,36,0.16)",
560:             border: "1px solid rgba(251,191,36,0.38)",
561:             borderRadius: 14,
562:             padding: 16,
563:             color: "#fef3c7",
564:           }}
565:         >
566:           <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2 }}>
567:             MANUAL REVIEW REQUIRED
568:           </div>
569: 
570:           <p style={{ marginTop: 8, marginBottom: 12, color: "#fde68a" }}>
571:             Manual review is required before this runner can complete the run.
572:             Review the receipt amount, final amount, max runner spend, and proof status.
573:           </p>
574: 
575:           <button
576:             onClick={() => onApproveManualReview?.(run.id)}
577:             disabled={approvingManualReview}
578:             style={{
579:               border: "none",
580:               background: approvingManualReview ? "#92400e" : "#fbbf24",
581:               color: "#111827",
582:               borderRadius: 10,
583:               padding: "10px 14px",
584:               cursor: approvingManualReview ? "not-allowed" : "pointer",
585:               fontWeight: 900,
586:             }}
587:           >
588:             {approvingManualReview ? "Approving..." : "Approve Manual Review"}
589:           </button>
590:         </div>
591:       )}
592: 
593:       <div
594:         style={{
595:           marginTop: 18,
596:           background: "rgba(59,130,246,0.16)",
597:           border: "1px solid rgba(147,197,253,0.28)",
598:           borderRadius: 14,
599:           padding: 14,
600:           color: "#dbeafe",
601:           fontWeight: 700,
602:         }}
603:       >
604:         {getNextStep(run.status)}
605:       </div>
606:     </section>
607:   );
608: }
609: 
610: 
611: export default function Dashboard({ onLogout }) {
612:   const navigate = useNavigate();
613:   const token = localStorage.getItem("token");
614:   const isMobile = useIsMobile();
615: 
616:   const [role, setRole] = useState(null);
617:   const [runs, setRuns] = useState([]);
618:   const [loading, setLoading] = useState(true);
619:   const [notification, setNotification] = useState(null);
620:   const [newRun, setNewRun] = useState({
621:     location: "",
622:     item: "",
623:     payout: "25",
624:     itemBudgetEstimate: "0",
625:     platformFee: "3",
626:     bufferAmount: "5",
627:   });
628:   const [creatingRun, setCreatingRun] = useState(false);
629:   const creatingRunRef = useRef(false);
630:   const [selectedRunId, setSelectedRunId] = useState(null);
631:   const [approvingManualReview, setApprovingManualReview] = useState(false);
632:   const [authorizingHold, setAuthorizingHold] = useState(false);
633:   const approvingManualReviewRef = useRef(null);

---

817:         headers: { Authorization: `Bearer ${token}` },
818:       });
819: 
820:       const data = await response.json();
821: 
822:       if (!response.ok || data.success === false) {
823:         throw new Error(data.error || "Failed to authorize secure hold");
824:       }
825: 
826:       setRuns((prev) =>
827:         prev.map((run) =>
828:           run.id === runId ? { ...run, ...data.run } : run
829:         )
830:       );
831: 
832:       showSuccess(data.message || "Secure hold placeholder authorized. No live charge was made.");
833:       await fetchRuns();
834:     } catch (err) {
835:       showError(err.message || "Failed to authorize secure hold");
836:     } finally {
837:       if (authorizingHoldRef.current === runId) {
838:         authorizingHoldRef.current = null;
839:       }
840: 
841:       setAuthorizingHold(false);
842:     }
843:   };
844: 
845:   const approveManualReview = async (runId) => {
846:     if (!runId || !token) return;
847:     if (approvingManualReviewRef.current === runId) return;
848: 
849:     approvingManualReviewRef.current = runId;
850: 
851:     try {
852:       setApprovingManualReview(true);
853: 
854:       const response = await fetch(`${API_URL}/api/runs/${runId}/manual-review/approve`, {
855:         method: "POST",
856:         headers: { Authorization: `Bearer ${token}` },
857:       });
858: 
859:       const data = await response.json();
860: 
861:       if (!response.ok || data.success === false) {
862:         throw new Error(data.error || "Failed to approve manual review");
863:       }
864: 
865:       setRuns((prev) =>
866:         prev.map((run) =>
867:           run.id === runId ? { ...run, ...data.run } : run
868:         )
869:       );
870: 
871:       showSuccess("Manual review approved. Runner can complete this run.");
872:       await fetchRuns();
873:     } catch (err) {
874:       showError(err.message || "Failed to approve manual review");
875:     } finally {
876:       if (approvingManualReviewRef.current === runId) {
877:         approvingManualReviewRef.current = null;
878:       }
879: 
880:       setApprovingManualReview(false);
881:     }
882:   };
883: 
884:   const handleLogout = () => {
885:     if (onLogout) {
886:       onLogout();
887:       return;
888:     }
889: 
890:     localStorage.removeItem("token");
891:     localStorage.removeItem("role");
892:     navigate("/");
893:   };
894: 
895:     // RUN-UI-1C-CHECKPOINT-4: display-only requester Command Center data.
896:   const requesterCommandActiveRuns = Array.isArray(activeRuns) ? activeRuns : [];
897:   const requesterCommandHistoryRuns = Array.isArray(completedRuns) ? completedRuns : [];
898:   const requesterCommandActiveRun = requesterCommandActiveRuns[0] || null;
899:   const requesterCommandHoldReady = Boolean(
900:     requesterCommandActiveRun?.authorizationStatus || requesterCommandActiveRun?.holdStatus
901:   );
902:   const requesterCommandRunnerReady = Boolean(
903:     requesterCommandActiveRun?.runnerId ||
904:       requesterCommandActiveRun?.runner ||
905:       requesterCommandActiveRun?.acceptedAt
906:   );
907:   const requesterCommandProofReady = Boolean(
908:     requesterCommandActiveRun?.deliveryPin ||
909:       requesterCommandActiveRun?.deliveryConfirmation ||
910:       requesterCommandActiveRun?.receiptUrl ||
911:       requesterCommandActiveRun?.receiptImageUrl
912:   );
913:   const requesterCommandSteps = [
914:     {
915:       id: "created",
916:       title: "Run request created",
917:       copy: requesterCommandActiveRun
918:         ? "Live requester run data is now feeding this command surface."
919:         : "Create a run to activate this requester command surface.",
