# Window slice: frontend/src/RunnerDashboard.jsx


---

1: import { useEffect, useRef, useState } from "react";
2: import { apiRequest } from "./api/client";
3: import { socket } from "./lib/socket"; // âœ… shared socket (FIX)
4: import LiveMap from "./components/LiveMap";
5: import { RunnerCommandCenter, deriveRunnerCommandData } from "./components/runner";
6: 
7: function getCompletionSafety(run) {
8:   if (!run) {
9:     return {
10:       disabled: true,
11:       title: "No active run",
12:       detail: "Select an active run before completing.",
13:     };
14:   }
15: 
16:   const receiptRequired = Number(run.maxRunnerSpend || 0) > 0;
17:   const receiptUploaded = run.receiptStatus === "uploaded";
18:   const manualReviewRequired =
19:     Boolean(run.requiresManualReview) ||
20:     run.receiptStatus === "review_required" ||
21:     run.payoutStatus === "manual_review_required";
22: 
23:   if (manualReviewRequired) {
24:     return {
25:       disabled: true,
26:       title: "Waiting for requester manual review",
27:       detail: "This run has a receipt or spend issue that must be approved before completion.",
28:     };
29:   }
30: 
31:   if (receiptRequired && !receiptUploaded) {
32:     return {
33:       disabled: true,
34:       title: "Waiting for receipt proof",
35:       detail: "Submit receipt amount and proof before completing this purchase run.",
36:     };
37:   }
38: 
39:   if (!run.deliveryConfirmedAt) {
40:     return {
41:       disabled: true,
42:       title: "Waiting for delivery PIN confirmation",
43:       detail: "Ask the requester for their delivery PIN, then confirm delivery.",
44:     };
45:   }
46: 
47:   return {
48:     disabled: false,
49:     title: "Ready to complete",
50:     detail: "Receipt proof and delivery confirmation are complete.",
51:   };
52: }
53: 
54: 
55: export default function RunnerDashboard({ user }) {
56:   const [online, setOnline] = useState(false);
57:   const [runs, setRuns] = useState([]);
58:   const [statusMessage, setStatusMessage] = useState("Offline");
59:   const [deliveryPins, setDeliveryPins] = useState({});
60:   const [receiptProofs, setReceiptProofs] = useState({});
61:   const [actionMessage, setActionMessage] = useState(null);
62:   const [acceptMessage, setAcceptMessage] = useState(null);
63:   const [acceptingRunId, setAcceptingRunId] = useState(null);
64:   const [activeAction, setActiveAction] = useState(null);
65: 
66:   const watchIdRef = useRef(null);
67:   const lastSentRef = useRef(0);
68:   const acceptingRunIdRef = useRef(null);
69:   const activeActionRef = useRef(null);
70: 
71:   ////////////////////////////////////////////////////////
72:   // FETCH RUNS
73:   ////////////////////////////////////////////////////////
74:   async function fetchRuns() {
75:     try {
76:       const res = await apiRequest("/api/runs");
77: 
78:       if (res.success) {
79:         setRuns(() => {
80:           const map = new Map();
81: 
82:           res.runs.forEach((r) => {
83:             if (
84:               r.status === "open" ||
85:               r.status === "assigned" ||
86:               r.status === "arrived" ||
87:               r.status === "in_progress"
88:             ) {
89:               map.set(r.id, r);
90:             }
91:           });
92: 
93:           return Array.from(map.values());
94:         });
95:       }
96:     } catch (err) {
97:       console.error("Fetch runs error:", err);
98:     }
99:   }
100: 
101:   ////////////////////////////////////////////////////////
102:   // SOCKET EVENTS
103:   ////////////////////////////////////////////////////////
104:   useEffect(() => {
105:     if (!user?.id) return;

---

283:   ////////////////////////////////////////////////////////
284:   async function markArrived(id) {
285:     const actionKey = `${id}:arrived`;
286: 
287:     if (activeActionRef.current === actionKey) return;
288: 
289:     activeActionRef.current = actionKey;
290:     setActiveAction(actionKey);
291:     setActionMessage(null);
292: 
293:     try {
294:       const res = await apiRequest(`/api/runs/${id}/arrived`, {
295:         method: "POST",
296:       });
297: 
298:       if (res.success) {
299:         setActionMessage({ type: "success", text: "Arrival marked." });
300:         setRuns((prev) =>
301:           prev.map((r) =>
302:             r.id === id ? { ...r, ...res.run, status: res.run?.status || "arrived" } : r
303:           )
304:         );
305:         return;
306:       }
307: 
308:       setActionMessage({
309:         type: "error",
310:         text: res.error || "Could not mark this run as arrived.",
311:       });
312:     } catch (err) {
313:       setActionMessage({
314:         type: "error",
315:         text: err.message || "Could not mark this run as arrived.",
316:       });
317:     } finally {
318:       if (activeActionRef.current === actionKey) {
319:         activeActionRef.current = null;
320:       }
321: 
322:       setActiveAction((currentAction) =>
323:         currentAction === actionKey ? null : currentAction
324:       );
325:     }
326:   }
327: 
328:   async function submitReceiptProof(id) {
329:     const proof = receiptProofs[id] || {};
330:     const receiptAmount = Number(proof.receiptAmount);
331:     const receiptImageUrl = String(proof.receiptImageUrl || "").trim();
332: 
333:     if (!Number.isInteger(receiptAmount) || receiptAmount <= 0) {
334:       setActionMessage({ type: "error", text: "Enter a valid whole-dollar receipt amount." });
335:       return;
336:     }
337: 
338:     if (!receiptImageUrl) {
339:       setActionMessage({ type: "error", text: "Enter a receipt proof URL." });
340:       return;
341:     }
342: 
343:     const actionKey = `${id}:receipt-proof`;
344: 
345:     if (activeActionRef.current === actionKey) return;
346: 
347:     activeActionRef.current = actionKey;
348:     setActiveAction(actionKey);
349:     setActionMessage(null);
350: 
351:     try {
352:       const res = await apiRequest(`/api/runs/${id}/receipt-proof`, {
353:         method: "POST",
354:         body: { receiptAmount, receiptImageUrl },
355:       });
356: 
357:       if (res.success) {
358:         setActionMessage({ type: "success", text: "Receipt proof submitted." });
359:         setReceiptProofs((prev) => ({ ...prev, [id]: {} }));
360:         setRuns((prev) =>
361:           prev.map((r) =>
362:             r.id === id ? { ...r, ...res.run } : r
363:           )
364:         );
365:         fetchRuns();
366:         return;
367:       }
368: 
369:       setActionMessage({
370:         type: "error",
371:         text: res.error || "Could not submit receipt proof.",
372:       });
373:     } catch (err) {
374:       setActionMessage({
375:         type: "error",
376:         text: err.message || "Could not submit receipt proof.",
377:       });
378:     } finally {
379:       if (activeActionRef.current === actionKey) {
380:         activeActionRef.current = null;
381:       }
382: 
383:       setActiveAction((currentAction) =>
384:         currentAction === actionKey ? null : currentAction
385:       );
386:     }
387:   }
388: 
389:   async function confirmDelivery(id) {
390:     const deliveryPin = String(deliveryPins[id] || "").trim();
391: 
392:     if (!deliveryPin) {
393:       setActionMessage({ type: "error", text: "Enter the requester delivery PIN." });
394:       return;
395:     }
396: 
397:     const actionKey = `${id}:confirm-delivery`;
398: 
399:     if (activeActionRef.current === actionKey) return;
400: 
401:     activeActionRef.current = actionKey;
402:     setActiveAction(actionKey);
403:     setActionMessage(null);
404: 
405:     try {
406:       const res = await apiRequest(`/api/runs/${id}/confirm-delivery`, {
407:         method: "POST",
408:         body: { deliveryPin },
409:       });
410: 
411:       if (res.success) {
412:         setActionMessage({ type: "success", text: "Delivery confirmed. Payout is now ready." });
413:         setDeliveryPins((prev) => ({ ...prev, [id]: "" }));
414:         setRuns((prev) =>
415:           prev.map((r) =>
416:             r.id === id ? { ...r, ...res.run } : r
417:           )
418:         );
419:         fetchRuns();
420:         return;
421:       }
422: 
423:       setActionMessage({
424:         type: "error",
425:         text: res.error || "Could not confirm delivery PIN.",
426:       });
427:     } catch (err) {
428:       setActionMessage({
429:         type: "error",
430:         text: err.message || "Could not confirm delivery PIN.",
431:       });
432:     } finally {
433:       if (activeActionRef.current === actionKey) {
434:         activeActionRef.current = null;
435:       }
436: 
437:       setActiveAction((currentAction) =>
438:         currentAction === actionKey ? null : currentAction
439:       );
440:     }
441:   }
442: 
443:   async function markComplete(id) {
444:     const actionKey = `${id}:complete`;
445: 
446:     if (activeActionRef.current === actionKey) return;
447: 
448:     activeActionRef.current = actionKey;
449:     setActiveAction(actionKey);
450:     setActionMessage(null);
451: 
452:     try {
453:       const res = await apiRequest(`/api/runs/${id}/complete`, {
454:         method: "POST",
455:       });
456: 
457:       if (res.success) {
458:         setActionMessage({ type: "success", text: "Run completed." });
459:         setRuns((prev) =>
460:           prev.map((r) =>
461:             r.id === id ? { ...r, ...res.run, status: "completed" } : r
462:           )
463:         );
464:         return;
465:       }
466: 
467:       setActionMessage({
468:         type: "error",
469:         text: res.error || "Could not complete this run.",
470:       });
471:     } catch (err) {
472:       setActionMessage({
473:         type: "error",
474:         text: err.message || "Could not complete this run.",
475:       });

---

564:           {activeRun.status === "assigned" && (
565:             <button
566:               onClick={() => markArrived(activeRun.id)}
567:               disabled={activeAction === `${activeRun.id}:arrived`}
568:               style={{
569:                 opacity: activeAction === `${activeRun.id}:arrived` ? 0.55 : 1,
570:                 cursor: activeAction === `${activeRun.id}:arrived` ? "not-allowed" : "pointer",
571:               }}
572:             >
573:               {activeAction === `${activeRun.id}:arrived` ? "Marking arrival..." : "Arrived"}
574:             </button>
575:           )}
576: 
577:           {activeRun.status === "arrived" && (
578:             <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
579:               {Number(activeRun.maxRunnerSpend || 0) > 0 && (
580:                 <div style={{
581:                   border: "1px solid #334155",
582:                   borderRadius: 10,
583:                   padding: 12,
584:                   background: "#0f172a"
585:                 }}>
586:                   <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800, letterSpacing: 1 }}>
587:                     SPEND LIMIT
588:                   </div>
589: 
590:                   <div style={{
591:                     marginTop: 8,
592:                     display: "grid",
593:                     gap: 8
594:                   }}>
595:                     <div style={{
596:                       display: "flex",
597:                       justifyContent: "space-between",
598:                       gap: 12
599:                     }}>
600:                       <span style={{ opacity: 0.75 }}>Max runner spend</span>
601:                       <strong>${Number(activeRun.maxRunnerSpend || 0)}</strong>
602:                     </div>
603: 
604:                     <div style={{
605:                       display: "flex",
606:                       justifyContent: "space-between",
607:                       gap: 12
608:                     }}>
609:                       <span style={{ opacity: 0.75 }}>Receipt status</span>
610:                       <strong>{String(activeRun.receiptStatus || "not_uploaded").replaceAll("_", " ")}</strong>
611:                     </div>
612: 
613:                     <div style={{
614:                       display: "flex",
615:                       justifyContent: "space-between",
616:                       gap: 12
617:                     }}>
618:                       <span style={{ opacity: 0.75 }}>Payout status</span>
619:                       <strong>{String(activeRun.payoutStatus || "not_started").replaceAll("_", " ")}</strong>
620:                     </div>
621:                   </div>
622: 
623:                   <p style={{
624:                     marginTop: 10,
625:                     marginBottom: 0,
626:                     color: "#cbd5e1",
627:                     fontSize: 13,
628:                     lineHeight: 1.5
629:                   }}>
630:                     Submit receipt proof for this purchase. Spending over the max runner spend
631:                     will require requester manual review before completion or payout.
632:                   </p>
633: 
634:                   {activeRun.requiresManualReview && (
635:                     <p style={{
636:                       marginTop: 10,
637:                       marginBottom: 0,
638:                       color: "#fde68a",
639:                       fontSize: 13,
640:                       fontWeight: 800
641:                     }}>
642:                       Manual review is required. Wait for requester approval before completing.
643:                     </p>
644:                   )}
645:                 </div>
646:               )}
647: 
648:               {Number(activeRun.maxRunnerSpend || 0) > 0 && (
649:                 <div style={{
650:                   border: "1px solid #333",
651:                   borderRadius: 10,
652:                   padding: 12,
653:                   background: "#181818"
654:                 }}>
655:                   <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>
656:                     PURCHASE PROOF
657:                   </div>
658: 
659:                   {activeRun.receiptStatus === "uploaded" ||
660:                   activeRun.receiptStatus === "review_required" ? (
661:                     <p style={{
662:                       color: activeRun.receiptStatus === "review_required" ? "#fde68a" : "#86efac",
663:                       marginBottom: 0
664:                     }}>
665:                       Receipt proof {activeRun.receiptStatus === "review_required" ? "needs review" : "uploaded"}.
666:                     </p>
667:                   ) : (
668:                     <>
669:                       <p style={{ opacity: 0.75 }}>
670:                         Submit receipt amount and proof before settlement.
671:                       </p>
672: 
673:                       <input
674:                         type="number"
675:                         min="1"
676:                         value={receiptProofs[activeRun.id]?.receiptAmount || ""}
677:                         onChange={(event) =>
678:                           setReceiptProofs((prev) => ({
679:                             ...prev,
680:                             [activeRun.id]: {
681:                               ...(prev[activeRun.id] || {}),
682:                               receiptAmount: event.target.value,
683:                             },
684:                           }))
685:                         }
686:                         placeholder="Receipt amount"
687:                         inputMode="numeric"
688:                         style={{
689:                           width: "100%",
690:                           boxSizing: "border-box",
691:                           padding: "10px 12px",
692:                           borderRadius: 8,
693:                           border: "1px solid #444",
694:                           background: "#0b0b0b",
695:                           color: "white",
696:                           marginBottom: 10,
697:                         }}
698:                       />
699: 
700:                       <input
701:                         value={receiptProofs[activeRun.id]?.receiptImageUrl || ""}
702:                         onChange={(event) =>
703:                           setReceiptProofs((prev) => ({
704:                             ...prev,
705:                             [activeRun.id]: {
706:                               ...(prev[activeRun.id] || {}),
707:                               receiptImageUrl: event.target.value,
708:                             },
709:                           }))
710:                         }
711:                         placeholder="Receipt proof URL"
712:                         style={{
713:                           width: "100%",
714:                           boxSizing: "border-box",
715:                           padding: "10px 12px",
716:                           borderRadius: 8,
717:                           border: "1px solid #444",
718:                           background: "#0b0b0b",
719:                           color: "white",
720:                           marginBottom: 10,
721:                         }}
722:                       />
723: 
724:                       <button
725:                         onClick={() => submitReceiptProof(activeRun.id)}
726:                         disabled={activeAction === `${activeRun.id}:receipt-proof`}
727:                         style={{
728:                           opacity: activeAction === `${activeRun.id}:receipt-proof` ? 0.55 : 1,
729:                           cursor: activeAction === `${activeRun.id}:receipt-proof` ? "not-allowed" : "pointer",
730:                         }}
731:                       >
732:                         {activeAction === `${activeRun.id}:receipt-proof` ? "Submitting receipt..." : "Submit Receipt Proof"}
733:                       </button>
734:                     </>
735:                   )}
736:                 </div>
737:               )}
738:               <div style={{
739:                 border: "1px solid #333",
740:                 borderRadius: 10,
741:                 padding: 12,
742:                 background: "#181818"
743:               }}>
744:                 <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>
745:                   DELIVERY SECURITY
746:                 </div>
747: 
748:                 {activeRun.deliveryConfirmedAt ? (
749:                   <p style={{ color: "#86efac", marginBottom: 0 }}>
750:                     Delivery confirmed. Payout is ready.
751:                   </p>
752:                 ) : (
753:                   <>
754:                     <p style={{ opacity: 0.75 }}>
755:                       Ask the requester for their delivery PIN before completing this run.
756:                     </p>
757: 
758:                     <input
759:                       value={deliveryPins[activeRun.id] || ""}
760:                       onChange={(event) =>
761:                         setDeliveryPins((prev) => ({
762:                           ...prev,
763:                           [activeRun.id]: event.target.value,
764:                         }))
765:                       }
766:                       placeholder="Enter delivery PIN"
767:                       inputMode="numeric"
768:                       style={{
769:                         width: "100%",
770:                         boxSizing: "border-box",
771:                         padding: "10px 12px",
772:                         borderRadius: 8,
773:                         border: "1px solid #444",
774:                         background: "#0b0b0b",
775:                         color: "white",
776:                         marginBottom: 10,
777:                       }}
778:                     />
779: 
780:                     <button
781:                       onClick={() => confirmDelivery(activeRun.id)}
782:                       disabled={activeAction === `${activeRun.id}:confirm-delivery`}
783:                       style={{
784:                         opacity: activeAction === `${activeRun.id}:confirm-delivery` ? 0.55 : 1,
785:                         cursor: activeAction === `${activeRun.id}:confirm-delivery` ? "not-allowed" : "pointer",
786:                       }}
787:                     >
788:                       {activeAction === `${activeRun.id}:confirm-delivery` ? "Confirming delivery..." : "Confirm Delivery PIN"}
789:                     </button>
790:                   </>
791:                 )}
792:               </div>
793:               <div
794:                 data-run-ui-1h="runner-delivery-pin-copy"
795:                 style={{
796:                   marginTop: 8,
797:                   marginBottom: 10,
798:                   padding: "10px 12px",
799:                   borderRadius: 14,
800:                   border: "1px solid rgba(14, 165, 233, 0.2)",
801:                   background: "rgba(224, 242, 254, 0.82)",
802:                   color: "#075985",
803:                   fontSize: 12,
804:                   lineHeight: 1.5,
805:                 }}
806:               >
807:                 {/* RUN-UI-1H-RUNNER-PIN-COPY */}
808:                 Ask the requester or recipient for the Delivery PIN at handoff. Do not request it before the delivery or task is verified.
809:               </div>
810: 
811:               {(() => {
812:                 const completionSafety = getCompletionSafety(activeRun);
813: 
814: 
815:   // RUN-UI-1D-CHECKPOINT-4: display-only data for runner command center preview.
816:   // RUN-UI-1D-CHECKPOINT-6: live-data derivation moved into a pure runner helper.
817:   // RUN-UI-1D-CHECKPOINT-6A: unused available/completed aliases removed after lint validation.
818:   const {
819:     focusedRun: runnerCommandFocusedRun,
820:     statusLabel: runnerCommandStatusLabel,
821:     metrics: runnerCommandMetrics,
822:     checklistItems: runnerCommandChecklistItems,
823:   } = deriveRunnerCommandData({
824:     availableRuns: Array.isArray(availableRuns) ? availableRuns : [],
825:     completedRuns: [],
826:     focusedRun: activeRun,
827:     statusLabel: online ? "Online" : "Offline",
828:   });
829: 
830: return (
831:                   <div style={{
832:                     border: "1px solid #333",
833:                     borderRadius: 10,
