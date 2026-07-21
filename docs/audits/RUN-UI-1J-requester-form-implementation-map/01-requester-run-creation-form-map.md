# RUN UI-1J Checkpoint 2 - Requester Run-Creation Form Implementation Map

## Status

IMPLEMENTATION MAP COMPLETE - no application source changed.

## Baseline

- Branch: main
- Baseline commit: f84e316
- Local main matched origin/main
- Environment: Windows

## Selected Scope

Normalize the requester run-creation form to established RUN UI primitives and validation patterns.

Primary surface:

- frontend/src/Dashboard.jsx

## Requester Form Slice

- Start line: 1011
- End line: 1258
- Raw requester controls found: 6

Indented source snapshot:

    1011:             </button>
    1012:           </div>
    1013:         </div>
    1014: 
    1015:         {notification && (
    1016:           <div
    1017:             style={{
    1018:               background: notification.type === "success" ? "#dcfce7" : "#fee2e2",
    1019:               color: notification.type === "success" ? "#166534" : "#991b1b",
    1020:               padding: 14,
    1021:               borderRadius: 12,
    1022:               marginBottom: 20,
    1023:               fontWeight: 700,
    1024:             }}
    1025:           >
    1026:             {notification.message}
    1027:           </div>
    1028:         )}
    1029: 
    1030:         <div
    1031:           style={{
    1032:             display: "grid",
    1033:             gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
    1034:             gap: 14,
    1035:             marginBottom: 28,
    1036:           }}
    1037:         >
    1038:           <div style={{ background: "white", borderRadius: 16, padding: 18 }}>
    1039:             <div className="run-requester-heading run-requester-surface run-requester-surface--active" style={{ color: "#64748b", fontWeight: 700 }}>Active Runs</div>
    1040:             <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
    1041:               {activeRuns.length}
    1042:             </div>
    1043:           </div>
    1044: 
    1045:           <div style={{ background: "white", borderRadius: 16, padding: 18 }}>
    1046:             <div style={{ color: "#64748b", fontWeight: 700 }}>Completed</div>
    1047:             <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
    1048:               {completedRuns.length}
    1049:             </div>
    1050:           </div>
    1051: 
    1052:           <div style={{ background: "white", borderRadius: 16, padding: 18 }}>
    1053:             <div style={{ color: "#64748b", fontWeight: 700 }}>Total Payout</div>
    1054:             <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
    1055:               ${runs.reduce((sum, run) => sum + Number(run.payout || 0), 0)}
    1056:             </div>
    1057:           </div>
    1058:         </div>
    1059: 
    1060:         <RunDetailPanel
    1061:           run={selectedRun}
    1062:           onClose={() => setSelectedRunId(null)}
    1063:           onApproveManualReview={approveManualReview}
    1064:           approvingManualReview={approvingManualReview}
    1065:           onAuthorizeHold={authorizeSecureHold}
    1066:           authorizingHold={authorizingHold}
    1067:         />
    1068: 
    1069:         <section className="run-requester-surface run-requester-surface--create"
    1070:           style={{
    1071:             background: "white",
    1072:             borderRadius: 18,
    1073:             padding: 22,
    1074:             marginBottom: 34,
    1075:             border: "1px solid #e5e7eb",
    1076:             boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
    1077:           }}
    1078:         >
    1079:           <h2 className="run-requester-heading" style={{ fontSize: 22, marginTop: 0, marginBottom: 14, color: "#0f172a" }}>
    1080:             Create Run
    1081:           </h2>
    1082: 
    1083:           <form
    1084:             onSubmit={createRun}
    1085:             style={{
    1086:               display: "grid",
    1087:               gridTemplateColumns: isMobile
    1088:                 ? "1fr"
    1089:                 : "1.1fr 1.5fr 0.65fr 0.75fr 0.65fr 0.65fr auto",
    1090:               gap: 12,
    1091:               alignItems: "end",
    1092:             }}
    1093:           >
    1094:             <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
    1095:               Location
    1096:               <input
    1097:                 value={newRun.location}
    1098:                 onChange={(event) =>
    1099:                   setNewRun((prev) => ({ ...prev, location: event.target.value }))
    1100:                 }
    1101:                 placeholder="Chicago Loop"
    1102:                 style={{
    1103:                   padding: "12px 14px",
    1104:                   borderRadius: 12,
    1105:                   border: "1px solid #cbd5e1",
    1106:                   fontSize: 14,
    1107:                 }}
    1108:               />
    1109:             </label>
    1110: 
    1111:             <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
    1112:               Item / Task
    1113:               <input
    1114:                 value={newRun.item}
    1115:                 onChange={(event) =>
    1116:                   setNewRun((prev) => ({ ...prev, item: event.target.value }))
    1117:                 }
    1118:                 placeholder="Pickup documents"
    1119:                 style={{
    1120:                   padding: "12px 14px",
    1121:                   borderRadius: 12,
    1122:                   border: "1px solid #cbd5e1",
    1123:                   fontSize: 14,
    1124:                 }}
    1125:               />
    1126:             </label>
    1127: 
    1128:             <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
    1129:               Payout
    1130:               <input
    1131:                 type="number"
    1132:                 min="1"
    1133:                 value={newRun.payout}
    1134:                 onChange={(event) =>
    1135:                   setNewRun((prev) => ({ ...prev, payout: event.target.value }))
    1136:                 }
    1137:                 style={{
    1138:                   padding: "12px 14px",
    1139:                   borderRadius: 12,
    1140:                   border: "1px solid #cbd5e1",
    1141:                   fontSize: 14,
    1142:                 }}
    1143:               />
    1144:             </label>
    1145: 
    1146:             <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
    1147:               Item Budget
    1148:               <input
    1149:                 type="number"
    1150:                 min="0"
    1151:                 value={newRun.itemBudgetEstimate}
    1152:                 onChange={(event) =>
    1153:                   setNewRun((prev) => ({
    1154:                     ...prev,
    1155:                     itemBudgetEstimate: event.target.value,
    1156:                   }))
    1157:                 }
    1158:                 placeholder="0"
    1159:                 style={{
    1160:                   padding: "12px 14px",
    1161:                   borderRadius: 12,
    1162:                   border: "1px solid #cbd5e1",
    1163:                   fontSize: 14,
    1164:                 }}
    1165:               />
    1166:             </label>
    1167: 
    1168:             <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
    1169:               Platform Fee
    1170:               <input
    1171:                 type="number"
    1172:                 min="0"
    1173:                 value={newRun.platformFee}
    1174:                 onChange={(event) =>
    1175:                   setNewRun((prev) => ({ ...prev, platformFee: event.target.value }))
    1176:                 }
    1177:                 style={{
    1178:                   padding: "12px 14px",
    1179:                   borderRadius: 12,
    1180:                   border: "1px solid #cbd5e1",
    1181:                   fontSize: 14,
    1182:                 }}
    1183:               />
    1184:             </label>
    1185: 
    1186:             <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
    1187:               Buffer
    1188:               <input
    1189:                 type="number"
    1190:                 min="0"
    1191:                 value={newRun.bufferAmount}
    1192:                 onChange={(event) =>
    1193:                   setNewRun((prev) => ({ ...prev, bufferAmount: event.target.value }))
    1194:                 }
    1195:                 style={{
    1196:                   padding: "12px 14px",
    1197:                   borderRadius: 12,
    1198:                   border: "1px solid #cbd5e1",
    1199:                   fontSize: 14,
    1200:                 }}
    1201:               />
    1202:             </label>
    1203: 
    1204:             <button
    1205:               type="submit"
    1206:               disabled={creatingRun}
    1207:               style={{
    1208:                 padding: "13px 16px",
    1209:                 borderRadius: 12,
    1210:                 background: creatingRun ? "#94a3b8" : "#111827",
    1211:                 color: "white",
    1212:                 border: "none",
    1213:                 cursor: creatingRun ? "not-allowed" : "pointer",
    1214:                 fontWeight: 800,
    1215:               }}
    1216:             >
    1217:               {creatingRun ? "Creating..." : "Create Run"}
    1218:             </button>
    1219:           </form>
    1220: 
    1221:           <div
    1222:             style={{
    1223:               marginTop: 14,
    1224:               padding: 14,
    1225:               borderRadius: 14,
    1226:               background: "#f8fafc",
    1227:               border: "1px solid #e2e8f0",
    1228:               color: "#334155",
    1229:               display: "grid",
    1230:               gap: 6,
    1231:             }}
    1232:           >
    1233:             <div style={{ fontWeight: 900, color: "#0f172a" }}>
    1234:               Secure hold preview
    1235:             </div>
    1236:             <div>
    1237:               Estimated hold: <strong>{formatMoney(createRunSecurityPreview.holdAmount)}</strong>
    1238:             </div>
    1239:             <div>
    1240:               Max runner spend:{" "}
    1241:               <strong>{formatMoney(createRunSecurityPreview.maxRunnerSpend)}</strong>
    1242:             </div>
    1243:             <div style={{ fontSize: 12, color: "#64748b" }}>
    1244:               Item budget + payout + platform fee + buffer are used to protect requester funds
    1245:               and trigger receipt review if the runner spends over the allowed amount.
    1246:             </div>
    1247:           </div>
    1248:         </section>
    1249: 
    1250:         <section style={{ marginBottom: 34 }}>
    1251:           <h2 style={{ fontSize: 22, marginBottom: 14, color: "#0f172a" }}>
    1252:             Active Runs
    1253:           </h2>
    1254: 
    1255:           {loading ? (
    1256:             <p>Loading...</p>
    1257:           ) : activeRuns.length === 0 ? (
    1258:             <div

## Raw Control Inventory

- Dashboard.jsx:1096 - <input
- Dashboard.jsx:1113 - <input
- Dashboard.jsx:1130 - <input
- Dashboard.jsx:1148 - <input
- Dashboard.jsx:1170 - <input
- Dashboard.jsx:1188 - <input

## State and Event-Handler Inventory

- Dashboard.jsx:616 - const [role, setRole] = useState(null);
- Dashboard.jsx:617 - const [runs, setRuns] = useState([]);
- Dashboard.jsx:618 - const [loading, setLoading] = useState(true);
- Dashboard.jsx:619 - const [notification, setNotification] = useState(null);
- Dashboard.jsx:620 - const [newRun, setNewRun] = useState({
- Dashboard.jsx:628 - const [creatingRun, setCreatingRun] = useState(false);
- Dashboard.jsx:630 - const [selectedRunId, setSelectedRunId] = useState(null);
- Dashboard.jsx:631 - const [approvingManualReview, setApprovingManualReview] = useState(false);
- Dashboard.jsx:632 - const [authorizingHold, setAuthorizingHold] = useState(false);
- Dashboard.jsx:637 - setNotification({ type: "success", message });
- Dashboard.jsx:638 - setTimeout(() => setNotification(null), 3000);
- Dashboard.jsx:642 - setNotification({ type: "error", message });
- Dashboard.jsx:643 - setTimeout(() => setNotification(null), 4000);
- Dashboard.jsx:660 - setRuns(data.runs || []);
- Dashboard.jsx:664 - setLoading(false);
- Dashboard.jsx:676 - setRole(decoded.role);
- Dashboard.jsx:684 - const interval = setInterval(fetchRuns, 8000);
- Dashboard.jsx:744 - setCreatingRun(true);
- Dashboard.jsx:768 - setNewRun({
- Dashboard.jsx:783 - setCreatingRun(false);
- Dashboard.jsx:813 - setAuthorizingHold(true);
- Dashboard.jsx:826 - setRuns((prev) =>
- Dashboard.jsx:841 - setAuthorizingHold(false);
- Dashboard.jsx:852 - setApprovingManualReview(true);
- Dashboard.jsx:865 - setRuns((prev) =>
- Dashboard.jsx:880 - setApprovingManualReview(false);
- Dashboard.jsx:1062 - onClose={() => setSelectedRunId(null)}
- Dashboard.jsx:1099 - setNewRun((prev) => ({ ...prev, location: event.target.value }))
- Dashboard.jsx:1116 - setNewRun((prev) => ({ ...prev, item: event.target.value }))
- Dashboard.jsx:1135 - setNewRun((prev) => ({ ...prev, payout: event.target.value }))
- Dashboard.jsx:1153 - setNewRun((prev) => ({
- Dashboard.jsx:1175 - setNewRun((prev) => ({ ...prev, platformFee: event.target.value }))
- Dashboard.jsx:1193 - setNewRun((prev) => ({ ...prev, bufferAmount: event.target.value }))
- Dashboard.jsx:650 - const response = await fetch(`${API_URL}/api/runs`, {
- Dashboard.jsx:688 - const createRunSecurityPreview = useMemo(() => {
- Dashboard.jsx:712 - const createRun = async (event) => {
- Dashboard.jsx:746 - const response = await fetch(`${API_URL}/api/runs`, {
- Dashboard.jsx:747 - method: "POST",
- Dashboard.jsx:815 - const response = await fetch(`${API_URL}/api/runs/${runId}/authorize-hold`, {
- Dashboard.jsx:816 - method: "POST",
- Dashboard.jsx:854 - const response = await fetch(`${API_URL}/api/runs/${runId}/manual-review/approve`, {
- Dashboard.jsx:855 - method: "POST",
- Dashboard.jsx:1084 - onSubmit={createRun}
- Dashboard.jsx:1237 - Estimated hold: <strong>{formatMoney(createRunSecurityPreview.holdAmount)}</strong>
- Dashboard.jsx:1241 - <strong>{formatMoney(createRunSecurityPreview.maxRunnerSpend)}</strong>

## Current API Payload Window

Indented source snapshot:

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
    634:   const authorizingHoldRef = useRef(null);
    635: 
    636:   const showSuccess = (message) => {
    637:     setNotification({ type: "success", message });
    638:     setTimeout(() => setNotification(null), 3000);
    639:   };
    640: 
    641:   const showError = (message) => {
    642:     setNotification({ type: "error", message });
    643:     setTimeout(() => setNotification(null), 4000);
    644:   };
    645: 
    646:   const fetchRuns = useCallback(async () => {
    647:     if (!token) return;
    648: 
    649:     try {
    650:       const response = await fetch(`${API_URL}/api/runs`, {
    651:         headers: { Authorization: `Bearer ${token}` },
    652:       });
    653: 
    654:       const data = await response.json();
    655: 
    656:       if (!response.ok || data.success === false) {
    657:         throw new Error(data.error || "Failed to load runs");
    658:       }
    659: 
    660:       setRuns(data.runs || []);
    661:     } catch (err) {
    662:       showError(err.message || "Failed to load runs");
    663:     } finally {
    664:       setLoading(false);
    665:     }
    666:   }, [token]);
    667: 
    668:   useEffect(() => {
    669:     if (!token) {
    670:       navigate("/");
    671:       return;
    672:     }
    673: 
    674:     try {
    675:       const decoded = jwtDecode(token);
    676:       setRole(decoded.role);
    677:       fetchRuns();
    678:     } catch {
    679:       localStorage.removeItem("token");
    680:       navigate("/");
    681:       return;
    682:     }
    683: 
    684:     const interval = setInterval(fetchRuns, 8000);
    685:     return () => clearInterval(interval);
    686:   }, [fetchRuns, navigate, token]);
    687: 
    688:   const createRunSecurityPreview = useMemo(() => {
    689:     const payout = Number(newRun.payout || 0);
    690:     const itemBudgetEstimate = Number(newRun.itemBudgetEstimate || 0);
    691:     const platformFee = Number(newRun.platformFee || 0);
    692:     const bufferAmount = Number(newRun.bufferAmount || 0);
    693: 
    694:     const safePayout = Number.isFinite(payout) && payout > 0 ? payout : 0;
    695:     const safeBudget =
    696:       Number.isFinite(itemBudgetEstimate) && itemBudgetEstimate > 0 ? itemBudgetEstimate : 0;
    697:     const safePlatformFee =
    698:       Number.isFinite(platformFee) && platformFee > 0 ? platformFee : 0;
    699:     const safeBuffer = Number.isFinite(bufferAmount) && bufferAmount > 0 ? bufferAmount : 0;
    700: 
    701:     return {
    702:       holdAmount: safeBudget + safePayout + safePlatformFee + safeBuffer,
    703:       maxRunnerSpend: safeBudget + safeBuffer,
    704:     };
    705:   }, [
    706:     newRun.payout,
    707:     newRun.itemBudgetEstimate,
    708:     newRun.platformFee,
    709:     newRun.bufferAmount,
    710:   ]);
    711: 
    712:   const createRun = async (event) => {
    713:     event.preventDefault();
    714: 
    715:     const location = newRun.location.trim();
    716:     const item = newRun.item.trim();
    717:     const payout = Number(newRun.payout);
    718:     const itemBudgetEstimate = Number(newRun.itemBudgetEstimate || 0);
    719:     const platformFee = Number(newRun.platformFee || 0);
    720:     const bufferAmount = Number(newRun.bufferAmount || 0);
    721: 
    722:     if (!location || !item || !Number.isFinite(payout) || payout <= 0) {
    723:       showError("Enter a location, item, and valid payout.");
    724:       return;
    725:     }
    726: 
    727:     const secureAmounts = [itemBudgetEstimate, platformFee, bufferAmount];
    728: 
    729:     if (
    730:       secureAmounts.some((amount) => !Number.isInteger(amount) || amount < 0) ||
    731:       itemBudgetEstimate > 5000 ||
    732:       platformFee > 1000 ||
    733:       bufferAmount > 1000
    734:     ) {
    735:       showError("Enter valid whole-dollar budget, platform fee, and buffer amounts.");
    736:       return;
    737:     }
    738: 
    739:     if (creatingRunRef.current) return;
    740: 
    741:     creatingRunRef.current = true;
    742: 
    743:     try {
    744:       setCreatingRun(true);
    745: 
    746:       const response = await fetch(`${API_URL}/api/runs`, {
    747:         method: "POST",
    748:         headers: {
    749:           Authorization: `Bearer ${token}`,
    750:           "Content-Type": "application/json",
    751:         },
    752:         body: JSON.stringify({
    753:           location,
    754:           item,
    755:           payout,
    756:           itemBudgetEstimate,
    757:           platformFee,
    758:           bufferAmount,
    759:         }),
    760:       });
    761: 
    762:       const data = await response.json();
    763: 
    764:       if (!response.ok || data.success === false) {
    765:         throw new Error(data.error || "Failed to create run");
    766:       }
    767: 
    768:       setNewRun({
    769:         location: "",
    770:         item: "",
    771:         payout: "25",
    772:         itemBudgetEstimate: "0",
    773:         platformFee: "3",
    774:         bufferAmount: "5",
    775:       });
    776:       showSuccess("Run created and sent to available runners.");
    777:       await fetchRuns();
    778:     } catch (err) {
    779:       showError(err.message || "Failed to create run");
    780:     } finally {
    781:       creatingRunRef.current = false;
    782: 
    783:       setCreatingRun(false);
    784:     }
    785:   };
    786: 
    787:   const activeRuns = useMemo(
    788:     () => runs.filter((run) => run.status !== "completed"),
    789:     [runs]
    790:   );
    791: 
    792:   const completedRuns = useMemo(
    793:     () => runs.filter((run) => run.status === "completed"),
    794:     [runs]
    795:   );
    796: 
    797:   const selectedRun = useMemo(() => {
    798:     if (selectedRunId) {
    799:       return runs.find((run) => run.id === selectedRunId) || null;
    800:     }
    801: 
    802:     return activeRuns[0] || completedRuns[0] || null;
    803:   }, [runs, selectedRunId, activeRuns, completedRuns]);
    804: 
    805:   const authorizeSecureHold = async (runId) => {
    806:     if (!runId || !token) return;
    807:     if (authorizingHoldRef.current === runId) return;
    808: 
    809:     authorizingHoldRef.current = runId;
    810: 
    811: 
    812:     try {
    813:       setAuthorizingHold(true);
    814: 
    815:       const response = await fetch(`${API_URL}/api/runs/${runId}/authorize-hold`, {
    816:         method: "POST",
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

## Payload-Preservation Contract

- Preserve the existing POST /api/runs route.
- Preserve the existing request property names and value types.
- Preserve numeric conversion behavior.
- Preserve purchase-budget and secure-hold behavior.
- Preserve success and failure state transitions.
- Do not introduce a backend or database dependency.

## Available UI Primitive Candidates

- index - frontend/src/components/runner/index.js
- RunnerRunCard - frontend/src/components/runner/RunnerRunCard.jsx
- Button - frontend/src/components/ui/Button.jsx
- Card - frontend/src/components/ui/Card.jsx
- index - frontend/src/components/ui/index.js
- MissionCard - frontend/src/components/ui/MissionCard.jsx

## Validation and Feedback Inventory

- Dashboard.jsx:517 - disabled={
- Dashboard.jsx:567 - MANUAL REVIEW REQUIRED
- Dashboard.jsx:571 - Manual review is required before this runner can complete the run.
- Dashboard.jsx:577 - disabled={approvingManualReview}
- Dashboard.jsx:636 - const showSuccess = (message) => {
- Dashboard.jsx:641 - const showError = (message) => {
- Dashboard.jsx:642 - setNotification({ type: "error", message });
- Dashboard.jsx:657 - throw new Error(data.error || "Failed to load runs");
- Dashboard.jsx:662 - showError(err.message || "Failed to load runs");
- Dashboard.jsx:689 - const payout = Number(newRun.payout || 0);
- Dashboard.jsx:690 - const itemBudgetEstimate = Number(newRun.itemBudgetEstimate || 0);
- Dashboard.jsx:691 - const platformFee = Number(newRun.platformFee || 0);
- Dashboard.jsx:692 - const bufferAmount = Number(newRun.bufferAmount || 0);
- Dashboard.jsx:715 - const location = newRun.location.trim();
- Dashboard.jsx:716 - const item = newRun.item.trim();
- Dashboard.jsx:717 - const payout = Number(newRun.payout);
- Dashboard.jsx:718 - const itemBudgetEstimate = Number(newRun.itemBudgetEstimate || 0);
- Dashboard.jsx:719 - const platformFee = Number(newRun.platformFee || 0);
- Dashboard.jsx:720 - const bufferAmount = Number(newRun.bufferAmount || 0);
- Dashboard.jsx:723 - showError("Enter a location, item, and valid payout.");
- Dashboard.jsx:735 - showError("Enter valid whole-dollar budget, platform fee, and buffer amounts.");
- Dashboard.jsx:765 - throw new Error(data.error || "Failed to create run");
- Dashboard.jsx:776 - showSuccess("Run created and sent to available runners.");
- Dashboard.jsx:779 - showError(err.message || "Failed to create run");
- Dashboard.jsx:823 - throw new Error(data.error || "Failed to authorize secure hold");
- Dashboard.jsx:832 - showSuccess(data.message || "Secure hold placeholder authorized. No live charge was made.");
- Dashboard.jsx:835 - showError(err.message || "Failed to authorize secure hold");
- Dashboard.jsx:862 - throw new Error(data.error || "Failed to approve manual review");
- Dashboard.jsx:871 - showSuccess("Manual review approved. Runner can complete this run.");
- Dashboard.jsx:874 - showError(err.message || "Failed to approve manual review");
- Dashboard.jsx:1055 - ${runs.reduce((sum, run) => sum + Number(run.payout || 0), 0)}
- Dashboard.jsx:1206 - disabled={creatingRun}

## Checkpoint 3 Implementation Boundary

Checkpoint 3 may:

- Replace the six requester raw controls with compatible existing RUN UI primitives.
- Improve labels, grouping, helper text, focus treatment, required-state display, and inline validation.
- Add narrowly scoped requester-form presentation styles when existing tokens are insufficient.

Checkpoint 3 must preserve:

- Existing state ownership.
- Existing submit handler.
- Existing API endpoint and payload.
- Existing secure-hold behavior.
- Existing run creation success and error behavior.

Checkpoint 3 must not:

- Change backend routes.
- Change database schema.
- Activate live Stripe charging.
- Modify RunnerDashboard receipt-proof behavior.
- Redesign Login.
- Deploy.

## Scope Confirmation

- Audit document only.
- No application source changes.
- No backend changes.
- No database schema changes.
- No commit or push performed.
- No deployment performed.

## Disposition

READY_FOR_RUN_UI_1J_CHECKPOINT_3_REQUESTER_FORM_IMPLEMENTATION
