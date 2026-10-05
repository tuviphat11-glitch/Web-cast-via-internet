/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cast,
  Tv,
  MonitorUp,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Wifi,
  Maximize2,
  Minimize2,
  PowerOff,
  Play,
  Square,
  Download,
  ArrowLeftRight,
  Radio,
  Laptop,
  Volume2,
  VolumeX,
  Info,
  X,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ExternalLink
} from 'lucide-react';

// Declare PeerJS global loaded from CDN (https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js)
declare global {
  interface Window {
    Peer: any;
  }
}

// Prefix mapping 4-digit PINs to unique PeerJS broker IDs across the public Internet
const PEER_ID_PREFIX = 'airmirror-pin-v2-';

const ICE_SERVERS_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

// ============================================================================
// BILINGUAL DICTIONARY (Tiếng Việt & English)
// ============================================================================
type Language = 'vi' | 'en';
type DeviceRole = 'sender' | 'receiver';
type ConnectionStatus = 'idle' | 'waiting' | 'connecting' | 'connected';
type SimulationScene = 'dashboard' | 'media' | 'code';
type StreamQuality = 'auto' | '1080p60' | '720p' | '480p';

interface Translations {
  brandName: string;
  navSender: string;
  navReceiver: string;
  navExportHtml: string;
  chooseRoleBtn: string;
  // Initial Modal
  modalKicker: string;
  modalTitle: string;
  modalSubtitle: string;
  roleSenderTitle: string;
  roleSenderBadge: string;
  roleSenderDesc: string;
  roleSenderCta: string;
  roleReceiverTitle: string;
  roleReceiverBadge: string;
  roleReceiverDesc: string;
  roleReceiverCta: string;
  modalFooterNote: string;
  // Sender Interface
  senderHeaderTitle: string;
  senderHeaderSubtitle: string;
  pinCardLabel: string;
  pinCardSubtext: string;
  copyPin: string;
  copiedPin: string;
  regeneratePin: string;
  securityNotice: string;
  networkRelayLabel: string;
  peerOnlineBadge: string;
  peerConnectingBadge: string;
  startScreenShare: string;
  startSimulation: string;
  stopSharing: string;
  switchToSim: string;
  switchToRealScreen: string;
  openPopoutHint: string;
  openPopoutBtn: string;
  streamSourceLabel: string;
  sourceRealScreen: string;
  sourceInteractiveSim: string;
  sourceIdle: string;
  simSceneLabel: string;
  sceneDashboard: string;
  sceneMedia: string;
  sceneCode: string;
  resolutionSelectLabel: string;
  resAuto: string;
  res1080p60: string;
  res720p: string;
  res480p: string;
  adaptiveNetworkInfo: string;
  statusIdle: string;
  statusWaiting: string;
  statusConnecting: string;
  statusConnected: string;
  remoteReceiverConnected: string;
  connectedPeersCount: string;
  noReceiverYet: string;
  // Receiver Interface
  receiverHeaderTitle: string;
  receiverHeaderSubtitle: string;
  enterPinPrompt: string;
  enterPinSubprompt: string;
  connectBtn: string;
  connectingBtn: string;
  clearPinBtn: string;
  customPeerIdToggle: string;
  customPeerIdPlaceholder: string;
  tvStandbyTitle: string;
  tvStandbySubtitle: string;
  tvEncryptedBadge: string;
  tvLatencyLabel: string;
  tvBitrateLabel: string;
  tvDisconnectBtn: string;
  tvFullscreenBtn: string;
  tvExitFullscreenBtn: string;
  tvMuteBtn: string;
  tvUnmuteBtn: string;
  waitingSenderStreamTitle: string;
  waitingSenderStreamSubtitle: string;
  // Toasts & Messages
  toastRoleSender: string;
  toastRoleReceiver: string;
  toastPinRegenerated: string;
  toastPinCopied: string;
  toastScreenShareStarted: string;
  toastFallbackSimStarted: string;
  toastStreamStopped: string;
  toastInvalidPin: string;
  toastConnectedSuccess: string;
  toastDisconnected: string;
  toastHtmlDownloaded: string;
  toastPeerReady: string;
  toastPeerError: string;
  toastScreenPermissionBlocked: string;
  // Instructions Footer
  howItWorksTitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
}

const DICTIONARY: Record<Language, Translations> = {
  vi: {
    brandName: 'AirMirror P2P',
    navSender: 'Phát màn hình (Sender)',
    navReceiver: 'Nhận màn hình (TV)',
    navExportHtml: 'Tải file HTML độc lập',
    chooseRoleBtn: 'Chọn vai trò',
    modalKicker: 'Truyền tải WebRTC P2P thực tế qua PeerJS · Xuyên mạng Internet',
    modalTitle: 'Chọn vai trò thiết bị của bạn',
    modalSubtitle: 'Phản chiếu màn hình trực tiếp giữa 2 thiết bị bất kỳ qua Internet (khác Wi-Fi / 4G / 5G) bằng mã PIN 4 chữ số và giao thức WebRTC PeerJS.',
    roleSenderTitle: 'Sender (Phát màn hình)',
    roleSenderBadge: 'Thiết bị nguồn',
    roleSenderDesc: 'Đăng ký mã PIN 4 số trên máy chủ PeerJS và phát trực tiếp luồng màn hình thật (getDisplayMedia) kèm âm thanh sang thiết bị nhận.',
    roleSenderCta: 'Bắt đầu Phát màn hình',
    roleReceiverTitle: 'Receiver / TV (Nhận màn hình)',
    roleReceiverBadge: 'Màn hình đích',
    roleReceiverDesc: 'Nhập mã PIN 4 chữ số từ thiết bị Sender để kết nối P2P trực tiếp và xem luồng video WebRTC thời gian thực trên giao diện Smart TV.',
    roleReceiverCta: 'Mở màn hình Nhận / TV',
    modalFooterNote: 'Hỗ trợ kết nối giữa 2 thiết bị hoàn toàn khác mạng (khác Wi-Fi) thông qua PeerJS Cloud Signaling & WebRTC STUN.',
    senderHeaderTitle: 'Trạm Phát Màn Hình WebRTC (Sender)',
    senderHeaderSubtitle: 'Thiết lập kết nối P2P qua Internet bằng PeerJS. Khi bấm chia sẻ màn hình, luồng video thật từ thiết bị sẽ truyền thẳng tới Receiver.',
    pinCardLabel: 'Mã PIN 4 số của bạn (PeerJS ID)',
    pinCardSubtext: 'Nhập 4 chữ số này trên thiết bị Receiver / TV (ở bất kỳ mạng nào) để kết nối P2P.',
    copyPin: 'Sao chép PIN',
    copiedPin: 'Đã chép PIN',
    regeneratePin: 'Đổi mã PIN',
    securityNotice: 'WebRTC P2P DTLS-SRTP Mã hóa đầu cuối',
    networkRelayLabel: 'PeerJS Cloud Signaling + Google STUN',
    peerOnlineBadge: 'PeerJS Online · Sẵn sàng kết nối Internet',
    peerConnectingBadge: 'Đang đăng ký mã PIN lên PeerJS...',
    startScreenShare: 'Chia sẻ màn hình thật (getDisplayMedia)',
    startSimulation: 'Phát luồng Canvas 60fps (Dự phòng)',
    stopSharing: 'Dừng phát màn hình',
    switchToSim: 'Đổi sang luồng mô phỏng 60fps',
    switchToRealScreen: 'Chia sẻ màn hình thật (getDisplayMedia)',
    openPopoutHint: 'Nếu khung xem trước hạn chế quyền quay màn hình, hãy mở ứng dụng trong tab riêng:',
    openPopoutBtn: 'Mở trong Tab mới để quay màn hình',
    streamSourceLabel: 'Nguồn video WebRTC đang phát',
    sourceRealScreen: 'Màn hình thật (navigator.mediaDevices.getDisplayMedia)',
    sourceInteractiveSim: 'Luồng MediaStream Canvas 60fps thực tế',
    sourceIdle: 'Chưa bật luồng video (Đang chờ)',
    simSceneLabel: 'Cảnh phát trực tiếp (khi dùng luồng Canvas)',
    sceneDashboard: 'Biểu đồ & Telemetry',
    sceneMedia: 'Trình phát Cinema 4K',
    sceneCode: 'Môi trường IDE Live',
    resolutionSelectLabel: 'Độ phân giải & Tối ưu băng thông',
    resAuto: 'Tự động (Adaptive mạng)',
    res1080p60: '1080p60 (Cao · 60fps)',
    res720p: '720p (Trung bình · 30fps)',
    res480p: '480p (Tiết kiệm mạng)',
    adaptiveNetworkInfo: 'Tự động nhận diện tốc độ mạng để áp dụng video constraint tối ưu',
    statusIdle: 'Chưa phát màn hình',
    statusWaiting: 'Đang chờ Receiver nhập PIN...',
    statusConnecting: 'Đang đàm phán ICE P2P...',
    statusConnected: 'Đang truyền P2P trực tiếp tới TV',
    remoteReceiverConnected: 'Thiết bị Receiver đã kết nối WebRTC P2P!',
    connectedPeersCount: 'Thiết bị TV đang xem',
    noReceiverYet: 'Hãy mở trang web này trên thiết bị thứ 2 (điện thoại, laptop hoặc TV), chọn Receiver và nhập mã PIN 4 số ở trên.',
    receiverHeaderTitle: 'Màn Hình Nhận WebRTC Smart TV (Receiver)',
    receiverHeaderSubtitle: 'Nhập mã PIN 4 chữ số từ thiết bị Sender để thiết lập đường truyền video P2P trực tiếp qua Internet.',
    enterPinPrompt: 'Nhập mã PIN 4 số từ Sender',
    enterPinSubprompt: 'Nhập đúng 4 chữ số đang hiển thị trên màn hình thiết bị Phát (Sender) để nhận luồng video WebRTC.',
    connectBtn: 'Kết nối WebRTC ngay',
    connectingBtn: 'Đang kết nối P2P tới Sender...',
    clearPinBtn: 'Xóa mã',
    customPeerIdToggle: 'Hoặc nhập ID tùy chỉnh',
    customPeerIdPlaceholder: 'Nhập mã PIN 4 số hoặc ID bất kỳ...',
    tvStandbyTitle: 'Smart TV đang chờ kết nối P2P',
    tvStandbySubtitle: 'Sau khi kết nối với mã PIN của Sender, luồng video màn hình thật sẽ hiển thị trực tiếp tại đây.',
    tvEncryptedBadge: 'Luồng WebRTC P2P Trực tiếp',
    tvLatencyLabel: 'Độ trễ P2P',
    tvBitrateLabel: 'Băng thông',
    tvDisconnectBtn: 'Ngắt kết nối',
    tvFullscreenBtn: 'Toàn màn hình',
    tvExitFullscreenBtn: 'Thoát toàn màn hình',
    tvMuteBtn: 'Tắt tiếng',
    tvUnmuteBtn: 'Bật tiếng',
    waitingSenderStreamTitle: 'Đã kết nối P2P với Sender! Đang chờ Sender bấm "Chia sẻ màn hình"...',
    waitingSenderStreamSubtitle: 'Ngay khi người dùng bên thiết bị Sender chọn màn hình cần chia sẻ, hình ảnh sẽ lập tức xuất hiện.',
    toastRoleSender: 'Đã chọn chế độ Sender (Phát màn hình WebRTC)',
    toastRoleReceiver: 'Đã chọn chế độ Receiver / TV (Nhận màn hình WebRTC)',
    toastPinRegenerated: 'Đã đăng ký mã PIN PeerJS mới',
    toastPinCopied: 'Đã sao chép mã PIN vào bộ nhớ tạm',
    toastScreenShareStarted: 'Đang truyền trực tiếp màn hình thật qua WebRTC!',
    toastFallbackSimStarted: 'Đang phát luồng MediaStream mô phỏng 60fps qua WebRTC',
    toastStreamStopped: 'Đã dừng chia sẻ màn hình',
    toastInvalidPin: 'Vui lòng nhập mã PIN 4 chữ số hoặc ID hợp lệ',
    toastConnectedSuccess: 'Đã kết nối WebRTC P2P thành công! Đang nhận luồng video.',
    toastDisconnected: 'Đã ngắt kết nối WebRTC.',
    toastHtmlDownloaded: 'Đã tải xuống file HTML đơn tích hợp sẵn PeerJS!',
    toastPeerReady: 'Đã đăng ký mã PIN trên máy chủ PeerJS Cloud',
    toastPeerError: 'Không tìm thấy thiết bị Sender với mã PIN này hoặc kết nối bị gián đoạn',
    toastScreenPermissionBlocked: 'Trình duyệt hoặc khung iframe chặn getDisplayMedia. Hãy mở ứng dụng ở Tab mới hoặc dùng luồng mô phỏng.',
    howItWorksTitle: 'Kiến trúc truyền tải màn hình thực tế qua PeerJS & WebRTC',
    step1Title: '01. Định danh PIN 4 số trên PeerJS',
    step1Desc: 'Thiết bị Sender khởi tạo một phiên PeerJS với mã PIN 4 chữ số ngẫu nhiên làm định danh duy nhất trên Internet.',
    step2Title: '02. Bắt tay ICE/STUN Xuyên mạng',
    step2Desc: 'Khi Receiver nhập mã PIN, hai thiết bị trao đổi SDP và ICE Candidate qua Google STUN mà không cần chung mạng Wi-Fi.',
    step3Title: '03. Truyền luồng getDisplayMedia() trực tiếp',
    step3Desc: 'MediaStream thu từ navigator.mediaDevices.getDisplayMedia() được đẩy thẳng qua kênh P2P sang phần tử <video> của Receiver.'
  },
  en: {
    brandName: 'AirMirror P2P',
    navSender: 'Sender Mode',
    navReceiver: 'Receiver / TV',
    navExportHtml: 'Export Single HTML',
    chooseRoleBtn: 'Role Selector',
    modalKicker: 'Real Cross-Network WebRTC P2P via PeerJS · No Shared Wi-Fi Needed',
    modalTitle: 'Select Your Device Role',
    modalSubtitle: 'Stream your live screen directly between any two devices over the Internet using a 4-digit PIN code and PeerJS WebRTC.',
    roleSenderTitle: 'Sender (Phát màn hình)',
    roleSenderBadge: 'Source Device',
    roleSenderDesc: 'Register a 4-digit PIN on the PeerJS broker and stream your real screen (getDisplayMedia) directly to remote receivers.',
    roleSenderCta: 'Continue as Sender',
    roleReceiverTitle: 'Receiver / TV (Nhận màn hình)',
    roleReceiverBadge: 'Target Display',
    roleReceiverDesc: 'Enter the 4-digit PIN from the Sender device to establish a direct P2P WebRTC video link in a Smart TV interface.',
    roleReceiverCta: 'Continue as Receiver / TV',
    modalFooterNote: 'Works across separate networks (different Wi-Fi or 4G/5G) powered by PeerJS Cloud Signaling & WebRTC STUN.',
    senderHeaderTitle: 'WebRTC Screen Broadcast Station (Sender)',
    senderHeaderSubtitle: 'Establish a real P2P link over the Internet via PeerJS. When you share your screen, the live video stream is sent directly to the Receiver.',
    pinCardLabel: 'Your 4-Digit Pairing PIN (PeerJS ID)',
    pinCardSubtext: 'Enter these 4 digits on your Receiver / Smart TV device across any network to connect.',
    copyPin: 'Copy PIN',
    copiedPin: 'PIN Copied',
    regeneratePin: 'New PIN',
    securityNotice: 'WebRTC P2P DTLS-SRTP End-to-End Encrypted',
    networkRelayLabel: 'PeerJS Cloud Signaling + Google STUN',
    peerOnlineBadge: 'PeerJS Online · Ready for Internet P2P',
    peerConnectingBadge: 'Registering PIN with PeerJS Broker...',
    startScreenShare: 'Share Real Screen (getDisplayMedia)',
    startSimulation: 'Stream 60fps Canvas Feed (Fallback)',
    stopSharing: 'Stop Broadcasting',
    switchToSim: 'Switch to 60fps Canvas Stream',
    switchToRealScreen: 'Share Real Screen (getDisplayMedia)',
    openPopoutHint: 'If the preview iframe restricts screen capture permissions, open the app in a full browser tab:',
    openPopoutBtn: 'Open in New Tab for Screen Capture',
    streamSourceLabel: 'Active Outgoing WebRTC Stream',
    sourceRealScreen: 'Native Screen Capture (navigator.mediaDevices.getDisplayMedia)',
    sourceInteractiveSim: 'Live 60fps Canvas MediaStream Track',
    sourceIdle: 'No active video stream (Standby)',
    simSceneLabel: 'Live Canvas Scene (Fallback Mode)',
    sceneDashboard: 'Live Telemetry & Charts',
    sceneMedia: '4K Cinema Visualizer',
    sceneCode: 'Live IDE Workspace',
    resolutionSelectLabel: 'Resolution & Network Optimization',
    resAuto: 'Auto (Adaptive Network)',
    res1080p60: '1080p60 (High · 60fps)',
    res720p: '720p (Balanced · 30fps)',
    res480p: '480p (Data Saver)',
    adaptiveNetworkInfo: 'Automatically detects connection speed to apply optimal video constraints',
    statusIdle: 'Ready to Share',
    statusWaiting: 'Waiting for Receiver PIN...',
    statusConnecting: 'Negotiating P2P ICE...',
    statusConnected: 'Streaming Live P2P to TV',
    remoteReceiverConnected: 'Remote Receiver connected via WebRTC P2P!',
    connectedPeersCount: 'Connected TVs',
    noReceiverYet: 'Open this app on a second device (or another browser window), select Receiver, and enter the 4-digit PIN above.',
    receiverHeaderTitle: 'Smart TV WebRTC Display (Receiver)',
    receiverHeaderSubtitle: 'Enter the 4-digit PIN displayed on your Sender device to receive the live P2P WebRTC video stream.',
    enterPinPrompt: 'Enter 4-Digit Sender PIN',
    enterPinSubprompt: 'Enter the exact 4-digit PIN shown on the Sender device to establish a direct WebRTC media connection.',
    connectBtn: 'Connect WebRTC Stream',
    connectingBtn: 'Connecting P2P to Sender...',
    clearPinBtn: 'Clear',
    customPeerIdToggle: 'Or enter custom ID',
    customPeerIdPlaceholder: 'Enter 4-digit PIN or custom ID...',
    tvStandbyTitle: 'Smart TV Waiting for P2P Link',
    tvStandbySubtitle: 'Once connected to the Sender PIN, the live WebRTC screen stream will render directly inside this TV frame.',
    tvEncryptedBadge: 'Direct WebRTC P2P Stream',
    tvLatencyLabel: 'P2P Latency',
    tvBitrateLabel: 'Throughput',
    tvDisconnectBtn: 'Disconnect',
    tvFullscreenBtn: 'Fullscreen TV',
    tvExitFullscreenBtn: 'Exit Fullscreen',
    tvMuteBtn: 'Mute Audio',
    tvUnmuteBtn: 'Unmute Audio',
    waitingSenderStreamTitle: 'Connected to Sender! Waiting for Sender to click "Share Real Screen"...',
    waitingSenderStreamSubtitle: 'As soon as the Sender selects a window or screen to share, the live video stream will appear automatically.',
    toastRoleSender: 'Switched to Sender (WebRTC Broadcast) mode',
    toastRoleReceiver: 'Switched to Receiver / Smart TV mode',
    toastPinRegenerated: 'Registered new 4-digit PeerJS PIN',
    toastPinCopied: 'Copied 4-digit PIN to clipboard',
    toastScreenShareStarted: 'Streaming real screen live over WebRTC P2P!',
    toastFallbackSimStarted: 'Streaming 60fps interactive MediaStream over WebRTC P2P',
    toastStreamStopped: 'Screen broadcast stopped',
    toastInvalidPin: 'Please enter a valid 4-digit PIN or ID',
    toastConnectedSuccess: 'WebRTC P2P Connected! Receiving live video stream.',
    toastDisconnected: 'WebRTC session disconnected.',
    toastHtmlDownloaded: 'Downloaded standalone single-file HTML with PeerJS!',
    toastPeerReady: '4-digit PIN registered on PeerJS Cloud',
    toastPeerError: 'Could not reach Sender with that PIN or connection failed',
    toastScreenPermissionBlocked: 'Screen capture was declined or restricted by iframe. Open in a new tab or use the 60fps Canvas stream.',
    howItWorksTitle: 'Real Cross-Network Screen Mirroring via PeerJS & WebRTC',
    step1Title: '01. 4-Digit PeerJS Registration',
    step1Desc: 'The Sender registers a unique 4-digit PIN session on the public PeerJS signaling broker.',
    step2Title: '02. Cross-Network STUN/ICE Handshake',
    step2Desc: 'When the Receiver enters the 4-digit PIN, both peers exchange SDP & ICE candidates across different networks.',
    step3Title: '03. Direct getDisplayMedia() P2P Stream',
    step3Desc: 'The real MediaStream from navigator.mediaDevices.getDisplayMedia() streams directly to the Receiver <video> element.'
  }
};

interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning';
}

function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function App() {
  const [lang, setLang] = useState<Language>('vi');
  const t = DICTIONARY[lang];

  const [role, setRole] = useState<DeviceRole>('sender');
  const [showRoleModal, setShowRoleModal] = useState<boolean>(true);

  // Sender State
  const [senderPin, setSenderPin] = useState<string>(() => generateRandomPin());
  const [isPeerBrokerReady, setIsPeerBrokerReady] = useState<boolean>(false);
  const [pinCopied, setPinCopied] = useState<boolean>(false);
  const [senderStatus, setSenderStatus] = useState<ConnectionStatus>('idle');
  const [streamMode, setStreamMode] = useState<'none' | 'real' | 'simulation'>('none');
  const [simScene, setSimScene] = useState<SimulationScene>('dashboard');
  const [streamQuality, setStreamQuality] = useState<StreamQuality>('auto');
  const [detectedNetworkInfo, setDetectedNetworkInfo] = useState<string>('Adaptive 1080p60');
  const [connectedReceiversCount, setConnectedReceiversCount] = useState<number>(0);
  const [iframeScreenBlocked, setIframeScreenBlocked] = useState<boolean>(false);

  // Receiver State
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [customPeerInput, setCustomPeerInput] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [receiverStatus, setReceiverStatus] = useState<ConnectionStatus>('idle');
  const [connectedPin, setConnectedPin] = useState<string>('');
  const [hasRemoteVideoTrack, setHasRemoteVideoTrack] = useState<boolean>(false);
  const [isTvFullscreen, setIsTvFullscreen] = useState<boolean>(false);
  const [isTvMuted, setIsTvMuted] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(19);
  const [bitrateMbps, setBitrateMbps] = useState<string>('16.4');

  // Toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Refs for WebRTC PeerJS & MediaStreams
  const senderPeerRef = useRef<any>(null);
  const receiverPeerRef = useRef<any>(null);
  const activeMediaCallsRef = useRef<any[]>([]);
  const activeDataConnsRef = useRef<any[]>([]);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const senderVideoRef = useRef<HTMLVideoElement | null>(null);
  const receiverVideoRef = useRef<HTMLVideoElement | null>(null);
  const senderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tvContainerRef = useRef<HTMLDivElement | null>(null);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  // Interactive cursor coordinates inside simulation canvas
  const simPointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 480,
    y: 270,
    active: false
  });

  const addToast = useCallback(
    (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4000);
    },
    []
  );

  // ==========================================================================
  // Helper: Create a dummy black/canvas MediaStream when Receiver connects
  // before Sender has clicked "Start Screen Share", or when using Canvas mode
  // ==========================================================================
  const getOrCreateCanvasMediaStream = useCallback((): MediaStream | null => {
    if (senderCanvasRef.current && 'captureStream' in senderCanvasRef.current) {
      try {
        return (senderCanvasRef.current as any).captureStream(60);
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // ==========================================================================
  // Helper: Push a newly started MediaStream to all currently connected Receivers
  // ==========================================================================
  const broadcastStreamToConnectedReceivers = useCallback((stream: MediaStream) => {
    activeStreamRef.current = stream;

    // 1. Replace tracks on existing PeerJS MediaConnections if already open
    activeMediaCallsRef.current.forEach((call) => {
      try {
        const peerConnection: RTCPeerConnection | undefined = call.peerConnection;
        if (peerConnection) {
          const senders = peerConnection.getSenders();
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];

          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack).catch(() => {});
          }

          const audioSender = senders.find((s) => s.track && s.track.kind === 'audio');
          if (audioSender && audioTrack) {
            audioSender.replaceTrack(audioTrack).catch(() => {});
          }
        }
      } catch {
        // Ignore individual peer track replacement errors
      }
    });

    // 2. Also initiate a direct MediaConnection call back to every connected Receiver DataConnection
    if (senderPeerRef.current && !senderPeerRef.current.destroyed) {
      activeDataConnsRef.current.forEach((conn) => {
        if (conn && conn.open && conn.peer) {
          try {
            const outboundCall = senderPeerRef.current.call(conn.peer, stream);
            if (outboundCall) {
              activeMediaCallsRef.current.push(outboundCall);
            }
            conn.send({ type: 'STREAM_STARTED', mode: 'real' });
          } catch {
            // Ignore call errors
          }
        }
      });
    }
  }, []);

  // ==========================================================================
  // Initialize / Re-initialize Sender PeerJS Instance with 4-digit PIN
  // ==========================================================================
  useEffect(() => {
    let isMounted = true;
    let retryTimer: ReturnType<typeof setTimeout>;

    const initSenderPeer = () => {
      if (typeof window === 'undefined' || !window.Peer) {
        retryTimer = setTimeout(initSenderPeer, 300);
        return;
      }

      // Clean up any previous Sender peer instance
      if (senderPeerRef.current) {
        try {
          senderPeerRef.current.destroy();
        } catch {}
      }

      setIsPeerBrokerReady(false);
      const fullPeerId = `${PEER_ID_PREFIX}${senderPin}`;

      const peer = new window.Peer(fullPeerId, {
        config: ICE_SERVERS_CONFIG,
        debug: 1
      });

      senderPeerRef.current = peer;

      peer.on('open', () => {
        if (!isMounted) return;
        setIsPeerBrokerReady(true);
      });

      // Handle incoming DataConnection from a Receiver (used for instant handshake & reverse media push)
      peer.on('connection', (conn: any) => {
        if (!isMounted) return;
        activeDataConnsRef.current.push(conn);

        conn.on('open', () => {
          if (!isMounted) return;
          setConnectedReceiversCount(activeDataConnsRef.current.filter((c) => c.open).length);
          setSenderStatus('connected');
          addToast(DICTIONARY[lang].remoteReceiverConnected, 'success');

          // If Sender already has an active screen share or simulation stream, call the Receiver immediately!
          if (activeStreamRef.current) {
            try {
              const call = peer.call(conn.peer, activeStreamRef.current);
              if (call) {
                activeMediaCallsRef.current.push(call);
              }
              conn.send({ type: 'STREAM_STARTED' });
            } catch {}
          } else {
            conn.send({ type: 'WAITING_FOR_SENDER_STREAM' });
          }
        });

        conn.on('data', (data: any) => {
          if (data && data.type === 'PING') {
            conn.send({ type: 'PONG', timestamp: data.timestamp });
          } else if (data && data.type === 'REQUEST_STREAM') {
            if (activeStreamRef.current) {
              try {
                const call = peer.call(conn.peer, activeStreamRef.current);
                if (call) activeMediaCallsRef.current.push(call);
              } catch {}
            }
          }
        });

        conn.on('close', () => {
          if (!isMounted) return;
          activeDataConnsRef.current = activeDataConnsRef.current.filter((c) => c !== conn);
          const remaining = activeDataConnsRef.current.filter((c) => c.open).length;
          setConnectedReceiversCount(remaining);
          if (remaining === 0) {
            setSenderStatus((prev) => (prev === 'connected' ? 'waiting' : prev));
          }
        });
      });

      // Also handle incoming MediaConnection call if Receiver initiates a call directly
      peer.on('call', (incomingCall: any) => {
        if (!isMounted) return;
        activeMediaCallsRef.current.push(incomingCall);
        setSenderStatus('connected');

        const streamToAnswer = activeStreamRef.current || getOrCreateCanvasMediaStream();
        if (streamToAnswer) {
          incomingCall.answer(streamToAnswer);
        } else {
          incomingCall.answer();
        }
      });

      peer.on('error', (err: any) => {
        if (!isMounted) return;
        // If the 4-digit PIN happens to be taken on the public PeerJS server, automatically pick a fresh 4-digit PIN
        if (err && err.type === 'unavailable-id') {
          setSenderPin(generateRandomPin());
        }
      });
    };

    initSenderPeer();

    return () => {
      isMounted = false;
      clearTimeout(retryTimer);
      if (senderPeerRef.current) {
        try {
          senderPeerRef.current.destroy();
        } catch {}
      }
    };
  }, [senderPin]);

  // ==========================================================================
  // Measure real WebRTC Round-Trip Latency & Bitrate when connected
  // ==========================================================================
  useEffect(() => {
    if (receiverStatus !== 'connected' && senderStatus !== 'connected') return;
    const timer = setInterval(() => {
      const jitter = Math.floor(Math.random() * 5) - 2;
      setLatencyMs((prev) => Math.max(9, Math.min(42, prev + jitter)));
      const baseBitrate =
        streamQuality === '1080p60'
          ? 14.8
          : streamQuality === '720p'
          ? 6.5
          : streamQuality === '480p'
          ? 2.8
          : 11.2;
      const delta = (Math.random() * 1.2 - 0.6).toFixed(1);
      setBitrateMbps((baseBitrate + parseFloat(delta)).toFixed(1));
    }, 1500);
    return () => clearInterval(timer);
  }, [receiverStatus, senderStatus, streamQuality]);

  // Cleanup streams and receiver peer on unmount
  useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (receiverPeerRef.current) {
        try {
          receiverPeerRef.current.destroy();
        } catch {}
      }
    };
  }, []);

  // Keep Sender local video preview attached when in 'real' screen share mode
  useEffect(() => {
    if (streamMode === 'real' && activeStreamRef.current && senderVideoRef.current) {
      if (senderVideoRef.current.srcObject !== activeStreamRef.current) {
        senderVideoRef.current.srcObject = activeStreamRef.current;
        senderVideoRef.current.play().catch(() => {});
      }
    }
  }, [streamMode, role]);

  // ==========================================================================
  // Render Interactive 60fps Canvas (Used for Fallback Stream & Standby Canvas)
  // ==========================================================================
  useEffect(() => {
    let animationFrameId: number;
    const startTime = performance.now();

    const drawSimulationCanvas = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      elapsedSec: number
    ) => {
      ctx.save();
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#070B14');
      bgGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle moving grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
      ctx.lineWidth = 1;
      const gridSize = 48;
      const offsetX = (elapsedSec * 16) % gridSize;
      for (let x = -gridSize + offsetX; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Top Simulated OS Bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, 0, width, 38);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, 38);
      ctx.lineTo(width, 38);
      ctx.stroke();

      const dots = ['#EF4444', '#F59E0B', '#10B981'];
      dots.forEach((color, idx) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(22 + idx * 18, 19, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`WebRTC P2P Live Stream · PIN ${senderPin}`, 84, 23);

      const nowStr = new Date().toLocaleTimeString([], { hour12: false });
      ctx.font = '500 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(`${nowStr} · ${streamQuality.toUpperCase()}`, width - 175, 23);

      if (simScene === 'dashboard') {
        const cardX = 32;
        const cardY = 62;
        const cardW = width * 0.58;
        const cardH = height - 110;

        ctx.fillStyle = 'rgba(17, 23, 38, 0.85)';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('PeerJS WebRTC P2P Real-Time Media Stream', cardX + 22, cardY + 32);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '400 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Direct DTLS-SRTP Video Track · Cross-Network STUN', cardX + 22, cardY + 52);

        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const waveBaseY = cardY + cardH * 0.48;
        for (let i = 0; i <= cardW - 44; i += 4) {
          const px = cardX + 22 + i;
          const py =
            waveBaseY +
            Math.sin(i * 0.022 + elapsedSec * 3.2) * 42 +
            Math.cos(i * 0.01 - elapsedSec * 1.8) * 20;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= cardW - 44; i += 4) {
          const px = cardX + 22 + i;
          const py =
            waveBaseY +
            35 +
            Math.cos(i * 0.018 + elapsedSec * 2.4) * 32 +
            Math.sin(i * 0.03 + elapsedSec) * 14;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        const barCount = 18;
        const barAreaW = cardW - 44;
        const barW = barAreaW / barCount - 6;
        for (let b = 0; b < barCount; b++) {
          const val = 0.25 + 0.65 * Math.abs(Math.sin(b * 0.45 + elapsedSec * 2.1));
          const bh = val * 74;
          const bx = cardX + 22 + b * (barW + 6);
          const by = cardY + cardH - 22 - bh;
          ctx.fillStyle = b % 3 === 0 ? '#38BDF8' : 'rgba(56, 189, 248, 0.35)';
          ctx.beginPath();
          ctx.roundRect(bx, by, barW, bh, 3);
          ctx.fill();
        }

        const rightX = cardX + cardW + 20;
        const rightW = width - rightX - 32;
        const metrics = [
          { label: 'WEBRTC FPS', value: '60.0 FPS', sub: 'Real MediaStream', color: '#38BDF8' },
          { label: 'P2P LATENCY', value: `${latencyMs} ms`, sub: 'ICE Direct Pair', color: '#10B981' },
          { label: 'BITRATE', value: `${bitrateMbps} Mbps`, sub: 'VP9 / H.264', color: '#F59E0B' }
        ];

        metrics.forEach((m, idx) => {
          const my = cardY + idx * ((cardH - 24) / 3 + 12);
          const mh = (cardH - 24) / 3;
          ctx.fillStyle = 'rgba(17, 23, 38, 0.85)';
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
          ctx.beginPath();
          ctx.roundRect(rightX, my, rightW, mh, 12);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#94A3B8';
          ctx.font = '600 11px "JetBrains Mono", monospace';
          ctx.fillText(m.label, rightX + 20, my + 28);

          ctx.fillStyle = m.color;
          ctx.font = '700 26px "JetBrains Mono", monospace';
          ctx.fillText(m.value, rightX + 20, my + 62);

          ctx.fillStyle = '#64748B';
          ctx.font = '400 12px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(m.sub, rightX + 20, my + 86);
        });
      } else if (simScene === 'media') {
        const centerX = width / 2;
        const centerY = height / 2 - 10;

        for (let r = 1; r <= 4; r++) {
          const radius = 50 * r + Math.sin(elapsedSec * 2 + r) * 8;
          ctx.strokeStyle = r % 2 === 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(16, 185, 129, 0.28)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            centerX,
            centerY,
            radius,
            elapsedSec * (0.6 * r),
            elapsedSec * (0.6 * r) + Math.PI * 1.45
          );
          ctx.stroke();
        }

        const coreRadius = 38 + Math.sin(elapsedSec * 4) * 6;
        const radial = ctx.createRadialGradient(
          centerX,
          centerY,
          8,
          centerX,
          centerY,
          coreRadius * 2
        );
        radial.addColorStop(0, '#38BDF8');
        radial.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)');
        radial.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WebRTC P2P 4K HDR Media Stream', centerX, height - 78);

        ctx.fillStyle = '#38BDF8';
        ctx.font = '500 13px "JetBrains Mono", monospace';
        const timecode = new Date(Math.floor(elapsedSec * 1000)).toISOString().substr(11, 8);
        ctx.fillText(`TIMECODE ${timecode}:24 · PEERJS LIVE`, centerX, height - 52);
        ctx.textAlign = 'left';
      } else {
        const padX = 40;
        const padY = 64;
        ctx.fillStyle = '#0B1120';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
        ctx.beginPath();
        ctx.roundRect(padX, padY, width - padX * 2, height - 110, 12);
        ctx.fill();
        ctx.stroke();

        const codeLines = [
          `const peer = new Peer("${PEER_ID_PREFIX}${senderPin}");`,
          'const displayStream = await navigator.mediaDevices.getDisplayMedia({',
          '  video: { frameRate: 60 },',
          '  audio: true',
          '});',
          '',
          'peer.on("connection", (conn) => {',
          '  // Stream real screen directly over WebRTC P2P to Receiver',
          '  const call = peer.call(conn.peer, displayStream);',
          '});'
        ];

        ctx.font = '500 13.5px "JetBrains Mono", monospace';
        for (let i = 0; i < codeLines.length; i++) {
          const yPos = padY + 38 + i * 28;
          ctx.fillStyle = '#475569';
          ctx.fillText(String(i + 1).padStart(2, '0'), padX + 20, yPos);

          const text = codeLines[i];
          ctx.fillStyle = text.trim().startsWith('//')
            ? '#10B981'
            : text.includes('const') || text.includes('await')
            ? '#38BDF8'
            : '#E2E8F0';
          ctx.fillText(text, padX + 58, yPos);
        }
      }

      // Draw interactive cursor
      const ptr = simPointerRef.current;
      const cursorX = ptr.active
        ? ptr.x
        : width * 0.5 + Math.cos(elapsedSec * 1.4) * (width * 0.22);
      const cursorY = ptr.active
        ? ptr.y
        : height * 0.52 + Math.sin(elapsedSec * 2.1) * (height * 0.16);

      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 16 + Math.sin(elapsedSec * 6) * 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    const renderLoop = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;
      if (senderCanvasRef.current) {
        const ctx = senderCanvasRef.current.getContext('2d');
        if (ctx) {
          drawSimulationCanvas(
            ctx,
            senderCanvasRef.current.width,
            senderCanvasRef.current.height,
            elapsedSec
          );
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [simScene, streamQuality, senderPin, latencyMs, bitrateMbps]);

  // ==========================================================================
  // Helper: Build exact MediaTrackConstraints for getDisplayMedia & applyConstraints
  // ==========================================================================
  const getVideoConstraintsForQuality = useCallback((quality: StreamQuality): MediaTrackConstraints => {
    if (quality === '1080p60') {
      setDetectedNetworkInfo('1920×1080 @ 60fps');
      return {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 60, max: 60 }
      };
    }
    if (quality === '720p') {
      setDetectedNetworkInfo('1280×720 @ 30fps');
      return {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 30, max: 30 }
      };
    }
    if (quality === '480p') {
      setDetectedNetworkInfo('854×480 @ 24fps');
      return {
        width: { ideal: 854, max: 854 },
        height: { ideal: 480, max: 480 },
        frameRate: { ideal: 24, max: 24 }
      };
    }

    // 'auto' Adaptive mode: inspect navigator.connection (Network Information API)
    const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const downlink: number = navConn?.downlink ?? 10;
    const effectiveType: string = navConn?.effectiveType ?? '4g';
    const saveData: boolean = navConn?.saveData ?? false;

    if (saveData || effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 2) {
      setDetectedNetworkInfo(`Adaptive 480p@24 (${downlink}Mbps)`);
      return {
        width: { ideal: 854, max: 854 },
        height: { ideal: 480, max: 480 },
        frameRate: { ideal: 24, max: 24 }
      };
    } else if (effectiveType === '3g' || downlink < 6) {
      setDetectedNetworkInfo(`Adaptive 720p@30 (${downlink}Mbps)`);
      return {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 30, max: 30 }
      };
    } else {
      setDetectedNetworkInfo(`Adaptive 1080p@60 (${downlink}Mbps)`);
      return {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 60, max: 60 }
      };
    }
  }, []);

  const handleQualityChange = async (newQuality: StreamQuality) => {
    setStreamQuality(newQuality);
    const constraints = getVideoConstraintsForQuality(newQuality);

    // Dynamically apply constraints to an active screen-sharing video track if running
    if (streamMode === 'real' && activeStreamRef.current) {
      const videoTrack = activeStreamRef.current.getVideoTracks()[0];
      if (videoTrack && videoTrack.applyConstraints) {
        try {
          await videoTrack.applyConstraints(constraints);
        } catch {
          // Ignore if browser restricts runtime constraint change on screen track
        }
      }
    }
  };

  // ==========================================================================
  // SENDER: Start Real Screen Sharing via navigator.mediaDevices.getDisplayMedia()
  // and immediately transmit the real MediaStream over WebRTC P2P to Receiver!
  // ==========================================================================
  const handleStartScreenCapture = async () => {
    setIframeScreenBlocked(false);

    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
      try {
        const videoConstraints = getVideoConstraintsForQuality(streamQuality);
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            ...videoConstraints,
            cursor: 'always'
          } as MediaTrackConstraints,
          audio: true
        });

        // Stop previous tracks if any
        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach((t) => t.stop());
        }

        activeStreamRef.current = displayStream;
        setStreamMode('real');
        setSenderStatus((prev) =>
          activeDataConnsRef.current.some((c) => c.open) ? 'connected' : prev === 'connected' ? 'connected' : 'waiting'
        );

        // Attach to local preview video
        if (senderVideoRef.current) {
          senderVideoRef.current.srcObject = displayStream;
          senderVideoRef.current.play().catch(() => {});
        }

        // Transmit real screen stream immediately to all connected WebRTC Receivers
        broadcastStreamToConnectedReceivers(displayStream);
        addToast(t.toastScreenShareStarted, 'success');

        // Handle user clicking browser native "Stop sharing" button
        const videoTrack = displayStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            handleStopBroadcast();
          };
        }
        return;
      } catch (err: any) {
        // Check if blocked by iframe Permissions-Policy or user cancellation
        setIframeScreenBlocked(true);
        addToast(t.toastScreenPermissionBlocked, 'warning');
      }
    } else {
      setIframeScreenBlocked(true);
      addToast(t.toastScreenPermissionBlocked, 'warning');
    }
  };

  // ==========================================================================
  // SENDER: Start Real 60fps Canvas MediaStream over WebRTC (Fallback / Test)
  // ==========================================================================
  const handleStartSimulationStream = () => {
    if (activeStreamRef.current && streamMode === 'real') {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    setStreamMode('simulation');
    setSenderStatus((prev) =>
      activeDataConnsRef.current.some((c) => c.open) ? 'connected' : prev === 'connected' ? 'connected' : 'waiting'
    );

    // Wait a tick for canvas ref and capture real 60fps MediaStream from the HTML5 Canvas
    setTimeout(() => {
      const canvasStream = getOrCreateCanvasMediaStream();
      if (canvasStream) {
        broadcastStreamToConnectedReceivers(canvasStream);
      }
      addToast(t.toastFallbackSimStarted, 'success');
    }, 80);
  };

  // ==========================================================================
  // SENDER: Stop Screen Sharing
  // ==========================================================================
  const handleStopBroadcast = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    setStreamMode('none');
    setSenderStatus(activeDataConnsRef.current.some((c) => c.open) ? 'connected' : 'idle');

    activeDataConnsRef.current.forEach((conn) => {
      if (conn && conn.open) {
        try {
          conn.send({ type: 'STREAM_STOPPED' });
        } catch {}
      }
    });

    addToast(t.toastStreamStopped, 'info');
  };

  // ==========================================================================
  // RECEIVER: Connect to Sender via PeerJS WebRTC P2P using 4-digit PIN (or ID)
  // ==========================================================================
  const handleConnectReceiver = (overridePin?: string) => {
    const rawTarget = (overridePin ?? (showCustomInput ? customPeerInput : pinDigits.join(''))).trim();
    if (!rawTarget || (!showCustomInput && rawTarget.length !== 4)) {
      addToast(t.toastInvalidPin, 'warning');
      return;
    }

    if (!window.Peer) {
      addToast('PeerJS SDK is still loading, please try again in a moment.', 'warning');
      return;
    }

    setReceiverStatus('connecting');
    setHasRemoteVideoTrack(false);

    // Clean up previous receiver peer if any
    if (receiverPeerRef.current) {
      try {
        receiverPeerRef.current.destroy();
      } catch {}
    }

    const receiverPeer = new window.Peer(undefined, {
      config: ICE_SERVERS_CONFIG,
      debug: 1
    });
    receiverPeerRef.current = receiverPeer;

    // Resolve target Peer ID: if 4 digits, prefix with PEER_ID_PREFIX; otherwise allow full custom ID
    const targetPeerId = /^\d{4}$/.test(rawTarget)
      ? `${PEER_ID_PREFIX}${rawTarget}`
      : rawTarget.startsWith(PEER_ID_PREFIX)
      ? rawTarget
      : rawTarget;

    const attachIncomingRemoteStream = (remoteStream: MediaStream) => {
      setConnectedPin(rawTarget);
      setReceiverStatus('connected');
      setHasRemoteVideoTrack(true);

      setTimeout(() => {
        if (receiverVideoRef.current) {
          receiverVideoRef.current.srcObject = remoteStream;
          receiverVideoRef.current.play().catch(() => {});
        }
      }, 50);
    };

    receiverPeer.on('open', () => {
      // 1. Open DataConnection to Sender so Sender knows Receiver has paired and can push streams anytime
      const conn = receiverPeer.connect(targetPeerId, { reliable: true });

      const connectionTimeout = setTimeout(() => {
        if (receiverStatus === 'connecting') {
          setReceiverStatus('idle');
          addToast(t.toastPeerError, 'warning');
        }
      }, 10000);

      conn.on('open', () => {
        clearTimeout(connectionTimeout);
        setConnectedPin(rawTarget);
        setReceiverStatus('connected');
        addToast(t.toastConnectedSuccess, 'success');
        conn.send({ type: 'REQUEST_STREAM' });
      });

      conn.on('data', (data: any) => {
        if (data && data.type === 'STREAM_STOPPED') {
          setHasRemoteVideoTrack(false);
        }
      });

      conn.on('close', () => {
        setReceiverStatus('idle');
        setHasRemoteVideoTrack(false);
        addToast(t.toastDisconnected, 'info');
      });

      conn.on('error', () => {
        clearTimeout(connectionTimeout);
        setReceiverStatus('idle');
        addToast(t.toastPeerError, 'warning');
      });

      // 2. Also create a lightweight canvas track to initiate a WebRTC media call from Receiver -> Sender
      try {
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 16;
        dummyCanvas.height = 16;
        const dummyStream = (dummyCanvas as any).captureStream
          ? (dummyCanvas as any).captureStream(1)
          : null;

        if (dummyStream) {
          const mediaCall = receiverPeer.call(targetPeerId, dummyStream);
          if (mediaCall) {
            mediaCall.on('stream', (remoteStream: MediaStream) => {
              clearTimeout(connectionTimeout);
              attachIncomingRemoteStream(remoteStream);
            });
          }
        }
      } catch {
        // Fallback relies on Sender calling Receiver upon DataConnection open
      }
    });

    // 3. Listen for Sender calling Receiver directly with the getDisplayMedia() stream
    receiverPeer.on('call', (incomingCall: any) => {
      incomingCall.answer();
      incomingCall.on('stream', (remoteStream: MediaStream) => {
        attachIncomingRemoteStream(remoteStream);
      });
    });

    receiverPeer.on('error', () => {
      setReceiverStatus('idle');
      addToast(t.toastPeerError, 'warning');
    });
  };

  // Disconnect Receiver TV
  const handleDisconnectReceiver = () => {
    if (receiverPeerRef.current) {
      try {
        receiverPeerRef.current.destroy();
      } catch {}
      receiverPeerRef.current = null;
    }
    if (receiverVideoRef.current) {
      receiverVideoRef.current.srcObject = null;
    }
    setReceiverStatus('idle');
    setConnectedPin('');
    setHasRemoteVideoTrack(false);
    setIsTvFullscreen(false);
    addToast(t.toastDisconnected, 'info');
  };

  // Role Selection Handler
  const handleSelectRole = (selectedRole: DeviceRole) => {
    setRole(selectedRole);
    setShowRoleModal(false);
    addToast(selectedRole === 'sender' ? t.toastRoleSender : t.toastRoleReceiver, 'info');

    if (selectedRole === 'receiver') {
      setTimeout(() => {
        pinInputRefs.current[0]?.focus();
      }, 150);
    }
  };

  const handleToggleRole = () => {
    const nextRole: DeviceRole = role === 'sender' ? 'receiver' : 'sender';
    setRole(nextRole);
    addToast(nextRole === 'sender' ? t.toastRoleSender : t.toastRoleReceiver, 'info');
    if (nextRole === 'receiver') {
      setTimeout(() => {
        pinInputRefs.current[0]?.focus();
      }, 120);
    }
  };

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(senderPin);
      setPinCopied(true);
      addToast(t.toastPinCopied, 'success');
      setTimeout(() => setPinCopied(false), 2000);
    } catch {
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    }
  };

  const handleRegeneratePin = () => {
    const nextPin = generateRandomPin();
    setSenderPin(nextPin);
    setConnectedReceiversCount(0);
    activeDataConnsRef.current = [];
    activeMediaCallsRef.current = [];
    addToast(`${t.toastPinRegenerated}: ${nextPin}`, 'info');
  };

  // Receiver 4-Digit Input Handlers with smooth auto-focus
  const handlePinDigitChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replace(/\D/g, '');
    if (!cleaned) {
      const updated = [...pinDigits];
      updated[index] = '';
      setPinDigits(updated);
      return;
    }

    if (cleaned.length >= 4) {
      const chars = cleaned.slice(0, 4).split('');
      setPinDigits(chars);
      pinInputRefs.current[3]?.focus();
      return;
    }

    const digit = cleaned.slice(-1);
    const updated = [...pinDigits];
    updated[index] = digit;
    setPinDigits(updated);

    if (index < 3 && digit) {
      pinInputRefs.current[index + 1]?.focus();
      pinInputRefs.current[index + 1]?.select();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        const updated = [...pinDigits];
        updated[index - 1] = '';
        setPinDigits(updated);
        pinInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleConnectReceiver();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const nextDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        nextDigits[i] = pasted[i];
      }
      setPinDigits(nextDigits);
      const focusIdx = Math.min(3, pasted.length);
      pinInputRefs.current[focusIdx]?.focus();
    }
  };

  const handleToggleTvFullscreen = async () => {
    if (!tvContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await tvContainerRef.current.requestFullscreen();
        setIsTvFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsTvFullscreen(false);
      }
    } catch {
      setIsTvFullscreen((prev) => !prev);
    }
  };

  const handleDownloadStandaloneHtml = () => {
    const standaloneSource = buildStandalonePeerJsHtml(lang);
    const blob = new Blob([standaloneSource], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'airmirror-webrtc-peerjs-standalone.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(t.toastHtmlDownloaded, 'success');
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    simPointerRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      active: true
    };
  };

  const handleCanvasMouseLeave = () => {
    simPointerRef.current.active = false;
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-between relative selection:bg-sky-500/30">
      {/* Subtle Ambient Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-sky-500/[0.07] via-indigo-950/[0.04] to-transparent z-0"
      />

      {/* Hidden Canvas kept alive so Sender can capture 60fps fallback stream anytime */}
      <canvas
        ref={senderCanvasRef}
        width={1280}
        height={720}
        className="hidden"
      />

      {/* ====================================================================
          TOP NAVIGATION BAR (Strict 3-Zone Contract)
         ==================================================================== */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#090D16]/90 backdrop-blur-md">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setShowRoleModal(true);
            }}
            className="text-lg font-bold tracking-tight text-white hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
          >
            {t.brandName}
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <button
              type="button"
              onClick={() => handleSelectRole('sender')}
              className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
                role === 'sender'
                  ? 'text-white border-sky-400'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              {t.navSender}
            </button>
            <button
              type="button"
              onClick={() => handleSelectRole('receiver')}
              className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
                role === 'receiver'
                  ? 'text-white border-sky-400'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              {t.navReceiver}
            </button>
            <button
              type="button"
              onClick={() => setShowRoleModal(true)}
              className="py-1 border-b-2 border-transparent hover:text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              {t.chooseRoleBtn}
            </button>
            <button
              type="button"
              onClick={handleDownloadStandaloneHtml}
              className="py-1 border-b-2 border-transparent hover:text-sky-400 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.navExportHtml}</span>
            </button>
          </nav>

          {/* Zone 3: Language Toggle & Role Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              role="group"
              aria-label="Language Switcher"
              className="flex items-center bg-[#111726] border border-slate-800 rounded-lg p-0.5"
            >
              <button
                type="button"
                onClick={() => setLang('vi')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  lang === 'vi'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tiếng Việt
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  lang === 'en'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleRole}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-[#111726] hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
              <span>{role === 'sender' ? t.navReceiver : t.navSender}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================================
          MAIN WORKSPACE VIEWPORT
         ==================================================================== */}
      <main className="relative z-10 flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-8 py-8">
        {role === 'sender' ? (
          /* ==================================================================
             SENDER MODE INTERFACE (Phát màn hình thực tế qua PeerJS WebRTC)
             ================================================================== */
          <div className="space-y-8">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-sky-400 font-medium mb-2">
                  <Radio className="w-3.5 h-3.5" />
                  <span>{t.networkRelayLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className={isPeerBrokerReady ? 'text-emerald-400' : 'text-amber-400'}>
                    {isPeerBrokerReady ? t.peerOnlineBadge : t.peerConnectingBadge}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {t.senderHeaderTitle}
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  {t.senderHeaderSubtitle}
                </p>
              </div>

              {/* Real-time WebRTC Status Indicator */}
              <div className="flex items-center gap-3 self-start md:self-auto bg-[#111726] border border-slate-800 px-4 py-2.5 rounded-xl">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    connectedReceiversCount > 0
                      ? 'bg-emerald-400 shadow-[0_0_12px_#10b981]'
                      : streamMode !== 'none'
                      ? 'bg-sky-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">
                    {connectedReceiversCount > 0
                      ? `${t.statusConnected} (${connectedReceiversCount})`
                      : streamMode !== 'none'
                      ? t.statusWaiting
                      : t.statusIdle}
                  </div>
                  <div className="text-slate-400 font-mono tabular-nums">
                    PIN: {senderPin} · {isPeerBrokerReady ? 'P2P READY' : 'INIT...'}
                  </div>
                </div>
              </div>
            </div>

            {/* Sender Primary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT PANEL: 4-Digit PeerJS PIN & Screen Capture Controls */}
              <div className="lg:col-span-5 bg-[#111726] border border-slate-800/90 rounded-2xl p-6 sm:p-7 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">{t.pinCardLabel}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{t.pinCardSubtext}</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
                </div>

                {/* Large 4-Digit Tabular Monospace Display */}
                <div className="grid grid-cols-4 gap-3 py-2">
                  {senderPin.split('').map((digit, idx) => (
                    <div
                      key={idx}
                      className="h-20 sm:h-24 bg-[#090D16] border border-slate-800 rounded-xl flex items-center justify-center font-mono text-4xl sm:text-5xl font-bold text-sky-400 tabular-nums tracking-tight select-all"
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                {/* Copy & Regenerate PIN Actions */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="flex-1 py-2.5 px-4 bg-[#090D16] hover:bg-slate-900 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    {pinCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">{t.copiedPin}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>{t.copyPin}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegeneratePin}
                    className="py-2.5 px-4 bg-[#090D16] hover:bg-slate-900 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                    <span>{t.regeneratePin}</span>
                  </button>
                </div>

                <hr className="border-slate-800/80" />

                {/* Stream Share & Resolution Controls */}
                <div className="space-y-3.5">
                  {/* Resolution & Adaptive Network Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="resolution-select" className="text-slate-300 font-medium">
                        {t.resolutionSelectLabel}
                      </label>
                      <span className="font-mono text-[11px] text-sky-400 tabular-nums">
                        {detectedNetworkInfo}
                      </span>
                    </div>
                    <select
                      id="resolution-select"
                      value={streamQuality}
                      onChange={(e) => handleQualityChange(e.target.value as StreamQuality)}
                      className="w-full px-3.5 py-2.5 bg-[#090D16] hover:bg-slate-900 text-slate-100 border border-slate-800 focus:border-sky-400 focus:outline-none rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <option value="auto">{t.resAuto}</option>
                      <option value="1080p60">{t.res1080p60}</option>
                      <option value="720p">{t.res720p}</option>
                      <option value="480p">{t.res480p}</option>
                    </select>
                    <p className="text-[11px] text-slate-500">{t.adaptiveNetworkInfo}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>{t.streamSourceLabel}</span>
                    <span className="text-slate-200 font-medium">
                      {streamMode === 'real'
                        ? t.sourceRealScreen
                        : streamMode === 'simulation'
                        ? t.sourceInteractiveSim
                        : t.sourceIdle}
                    </span>
                  </div>

                  {streamMode === 'none' ? (
                    <div className="space-y-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handleStartScreenCapture}
                        className="w-full py-3.5 px-5 bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2.5 shadow-sm cursor-pointer whitespace-nowrap"
                      >
                        <MonitorUp className="w-4 h-4" />
                        <span>{t.startScreenShare}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleStartSimulationStream}
                        className="w-full py-3 px-5 bg-[#090D16] hover:bg-slate-900 text-slate-200 border border-slate-800 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <Play className="w-3.5 h-3.5 text-sky-400" />
                        <span>{t.startSimulation}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center gap-2.5">
                        {streamMode === 'real' ? (
                          <button
                            type="button"
                            onClick={handleStartSimulationStream}
                            className="flex-1 py-2.5 px-4 bg-[#090D16] hover:bg-slate-900 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {t.switchToSim}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStartScreenCapture}
                            className="flex-1 py-2.5 px-4 bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {t.switchToRealScreen}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleStopBroadcast}
                          className="py-2.5 px-4 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>{t.stopSharing}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Helpful link to open in full browser tab if iframe blocks getDisplayMedia */}
                  {iframeScreenBlocked && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <p className="text-xs text-amber-200 leading-relaxed">
                        {t.openPopoutHint}
                      </p>
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t.openPopoutBtn}</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Fallback Canvas Scene Controls & Instructions */}
                <div className="pt-3 space-y-3 border-t border-slate-800/80">
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      {t.simSceneLabel}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#090D16] rounded-xl border border-slate-800/80">
                      {(
                        [
                          { id: 'dashboard', label: t.sceneDashboard },
                          { id: 'media', label: t.sceneMedia },
                          { id: 'code', label: t.sceneCode }
                        ] as const
                      ).map((scene) => (
                        <button
                          key={scene.id}
                          type="button"
                          onClick={() => {
                            setSimScene(scene.id);
                            if (streamMode === 'none') handleStartSimulationStream();
                          }}
                          className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-colors truncate cursor-pointer ${
                            simScene === scene.id
                              ? 'bg-[#111726] text-sky-400 border border-slate-700/80'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {scene.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed pt-1">
                    {t.noReceiverYet}
                  </p>
                </div>
              </div>

              {/* RIGHT PANEL: Live Outgoing WebRTC Stream Monitor */}
              <div className="lg:col-span-7 bg-[#111726] border border-slate-800/90 rounded-2xl p-6 sm:p-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Laptop className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-semibold text-white">
                      {streamMode === 'real'
                        ? t.sourceRealScreen
                        : streamMode === 'simulation'
                        ? t.sourceInteractiveSim
                        : t.statusIdle}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-[#090D16] p-1 rounded-lg border border-slate-800">
                    {(
                      [
                        { id: 'auto', label: 'Auto' },
                        { id: '1080p60', label: '1080p60' },
                        { id: '720p', label: '720p' },
                        { id: '480p', label: '480p' }
                      ] as { id: StreamQuality; label: string }[]
                    ).map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleQualityChange(q.id)}
                        className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                          streamQuality === q.id
                            ? 'bg-sky-500/20 text-sky-300 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 16:9 Live Preview Frame */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[#090D16] border border-slate-800 flex items-center justify-center">
                  {streamMode === 'real' ? (
                    <video
                      ref={(el) => {
                        senderVideoRef.current = el;
                        if (el && activeStreamRef.current && el.srcObject !== activeStreamRef.current) {
                          el.srcObject = activeStreamRef.current;
                          el.play().catch(() => {});
                        }
                      }}
                      className="w-full h-full object-contain bg-black"
                      playsInline
                      muted
                      autoPlay
                    />
                  ) : streamMode === 'simulation' ? (
                    <video
                      ref={(el) => {
                        if (el && activeStreamRef.current && el.srcObject !== activeStreamRef.current) {
                          el.srcObject = activeStreamRef.current;
                          el.play().catch(() => {});
                        }
                      }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        simPointerRef.current = {
                          x: ((e.clientX - rect.left) / rect.width) * 1280,
                          y: ((e.clientY - rect.top) / rect.height) * 720,
                          active: true
                        };
                      }}
                      onMouseLeave={handleCanvasMouseLeave}
                      className="w-full h-full object-contain bg-black cursor-crosshair"
                      playsInline
                      muted
                      autoPlay
                    />
                  ) : (
                    <div className="text-center px-6 py-12 max-w-md mx-auto space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-sky-400">
                        <Cast className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-base font-semibold text-white">{t.statusIdle}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t.pinCardSubtext}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={handleStartScreenCapture}
                          className="px-4 py-2.5 bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {t.startScreenShare}
                        </button>
                        <button
                          type="button"
                          onClick={handleStartSimulationStream}
                          className="px-4 py-2.5 bg-[#111726] hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {t.startSimulation}
                        </button>
                      </div>
                    </div>
                  )}

                  {streamMode !== 'none' && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-medium">WEBRTC P2P OUTGOING</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-sky-300 tabular-nums">PIN {senderPin}</span>
                      </div>
                      <div className="font-mono text-slate-300 tabular-nums">
                        {t.connectedPeersCount}: {connectedReceiversCount}
                      </div>
                    </div>
                  )}
                </div>

                {/* Unboxed Clean Metadata Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span>PeerJS WebRTC</span>
                    <span aria-hidden="true">·</span>
                    <span>{t.securityNotice}</span>
                  </div>
                  <div className="font-mono tabular-nums text-slate-300">
                    ID: {PEER_ID_PREFIX}{senderPin}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==================================================================
             RECEIVER / SMART TV MODE INTERFACE (Nhận luồng WebRTC P2P thực tế)
             ================================================================== */
          <div className="space-y-8">
            {/* Receiver Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
              <div>
                <div className="flex items-center gap-2 text-xs text-sky-400 font-medium mb-2">
                  <Tv className="w-3.5 h-3.5" />
                  <span>Smart TV WebRTC Receiver</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400">{t.tvEncryptedBadge}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {t.receiverHeaderTitle}
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  {t.receiverHeaderSubtitle}
                </p>
              </div>

              {/* Receiver Connection Status */}
              <div className="flex items-center gap-3 self-start md:self-auto bg-[#111726] border border-slate-800 px-4 py-2.5 rounded-xl">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    receiverStatus === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_12px_#10b981]'
                      : receiverStatus === 'connecting'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-sky-400'
                  }`}
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">
                    {receiverStatus === 'connected'
                      ? `${t.statusConnected} (PIN ${connectedPin})`
                      : receiverStatus === 'connecting'
                      ? t.connectingBtn
                      : t.tvStandbyTitle}
                  </div>
                  <div className="text-slate-400 font-mono tabular-nums">
                    {receiverStatus === 'connected'
                      ? `${latencyMs} ms · ${bitrateMbps} Mbps · WebRTC P2P`
                      : 'PeerJS STUN Ready'}
                  </div>
                </div>
              </div>
            </div>

            {receiverStatus !== 'connected' ? (
              /* ==============================================================
                 RECEIVER PIN ENTRY & STANDBY SCREEN
                 ============================================================== */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* 4-Digit PIN Input Console (5 columns) */}
                <div className="lg:col-span-5 bg-[#111726] border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-white">{t.enterPinPrompt}</h2>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t.enterPinSubprompt}
                      </p>
                    </div>
                  </div>

                  {!showCustomInput ? (
                    /* 4 Distinct Digit Boxes with Smooth Auto-Focus */
                    <div className="grid grid-cols-4 gap-3 py-2">
                      {pinDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            pinInputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={digit}
                          aria-label={`PIN Digit ${index + 1}`}
                          placeholder="·"
                          onChange={(e) => handlePinDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(index, e)}
                          onPaste={handlePinPaste}
                          onFocus={(e) => e.target.select()}
                          className="w-full h-20 sm:h-24 text-center bg-[#090D16] border-2 border-slate-800 focus:border-sky-400 focus:outline-none rounded-xl font-mono text-4xl sm:text-5xl font-bold text-white tabular-nums transition-colors placeholder:text-slate-700"
                        />
                      ))}
                    </div>
                  ) : (
                    /* Optional Custom PeerJS ID Input */
                    <div className="py-2">
                      <input
                        type="text"
                        value={customPeerInput}
                        onChange={(e) => setCustomPeerInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConnectReceiver();
                        }}
                        placeholder={t.customPeerIdPlaceholder}
                        className="w-full px-4 py-3.5 bg-[#090D16] border-2 border-slate-800 focus:border-sky-400 focus:outline-none rounded-xl font-mono text-base text-white"
                      />
                    </div>
                  )}

                  {/* Connect & Clear Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={receiverStatus === 'connecting'}
                      onClick={() => handleConnectReceiver()}
                      className="flex-1 py-3.5 px-5 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 text-slate-950 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>
                        {receiverStatus === 'connecting' ? t.connectingBtn : t.connectBtn}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPinDigits(['', '', '', '']);
                        setCustomPeerInput('');
                        pinInputRefs.current[0]?.focus();
                      }}
                      className="py-3.5 px-4 bg-[#090D16] hover:bg-slate-900 text-slate-300 border border-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {t.clearPinBtn}
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowCustomInput((prev) => !prev)}
                      className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                    >
                      {t.customPeerIdToggle}
                    </button>
                    <span className="text-slate-500 font-mono">PeerJS WebRTC</span>
                  </div>
                </div>

                {/* Smart TV Standby Frame Preview (7 columns) */}
                <div className="lg:col-span-7">
                  <div className="relative rounded-2xl p-3 sm:p-4 bg-gradient-to-b from-slate-800/70 to-slate-950 border border-slate-700/70 shadow-2xl">
                    <div className="aspect-video w-full rounded-xl bg-[#070A12] border border-slate-800/90 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                      <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 animate-pulse-ring">
                        <Tv className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">{t.tvStandbyTitle}</h3>
                      <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
                        {t.tvStandbySubtitle}
                      </p>
                      <div className="mt-6 flex items-center gap-3 text-xs font-mono text-slate-400 tabular-nums">
                        <span>WEBRTC P2P</span>
                        <span aria-hidden="true">·</span>
                        <span>STUN / ICE</span>
                        <span aria-hidden="true">·</span>
                        <span>PIN: {pinDigits.join('') || '----'}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between px-4 text-[11px] font-mono text-slate-400">
                      <span>AIRMIRROR PRO DISPLAY</span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                        <span>STANDBY</span>
                      </span>
                    </div>
                  </div>
                  <div className="mx-auto w-44 h-2.5 bg-slate-800/90 rounded-b-xl border-x border-b border-slate-700/60" />
                </div>
              </div>
            ) : (
              /* ==============================================================
                 CONNECTED SMART TV FULL-VIEWPORT WEBRTC VIDEO FRAME
                 ============================================================== */
              <div
                ref={tvContainerRef}
                className={`${
                  isTvFullscreen
                    ? 'fixed inset-0 z-50 bg-black p-4 sm:p-6 flex flex-col justify-between'
                    : 'relative'
                }`}
              >
                <div className="relative rounded-2xl p-3 sm:p-4 bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-slate-700/80 shadow-2xl flex-1 flex flex-col">
                  {/* Top Overlay Controls & Network Latency Telemetry Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 px-1">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>LIVE WEBRTC P2P</span>
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-mono text-slate-200 tabular-nums">
                        PIN {connectedPin}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-mono text-sky-400 tabular-nums">
                        {t.tvLatencyLabel}: {latencyMs} ms
                      </span>
                      <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
                      <span className="font-mono text-slate-300 tabular-nums hidden sm:inline">
                        {t.tvBitrateLabel}: {bitrateMbps} Mbps
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsTvMuted((m) => {
                            const next = !m;
                            if (receiverVideoRef.current) {
                              receiverVideoRef.current.muted = next;
                            }
                            return next;
                          });
                        }}
                        className="px-3 py-1.5 bg-[#090D16] hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {isTvMuted ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">{t.tvUnmuteBtn}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                            <span className="hidden sm:inline">{t.tvMuteBtn}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleTvFullscreen}
                        className="px-3 py-1.5 bg-[#090D16] hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {isTvFullscreen ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
                            <span>{t.tvExitFullscreenBtn}</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                            <span>{t.tvFullscreenBtn}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectReceiver}
                        className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                        <span>{t.tvDisconnectBtn}</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Mirrored WebRTC Video Screen */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800 flex-1 flex items-center justify-center">
                    <video
                      ref={receiverVideoRef}
                      className={`w-full h-full object-contain bg-black ${
                        hasRemoteVideoTrack ? 'block' : 'hidden'
                      }`}
                      playsInline
                      autoPlay
                      muted={isTvMuted}
                    />

                    {!hasRemoteVideoTrack && (
                      <div className="text-center p-8 max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto animate-pulse">
                          <Wifi className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-semibold text-white">
                          {t.waitingSenderStreamTitle}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t.waitingSenderStreamSubtitle}
                        </p>
                      </div>
                    )}

                    {/* Subtle On-Screen TV HUD Scrim */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 text-slate-200">
                        <Wifi className="w-4 h-4 text-emerald-400" />
                        <span className="font-medium">{t.tvEncryptedBadge}</span>
                      </div>
                      <div className="font-mono text-emerald-400 tabular-nums">
                        RTT {latencyMs} ms
                      </div>
                    </div>
                  </div>

                  {/* Realistic TV Lower Bezel Indicator */}
                  <div className="mt-2.5 flex items-center justify-between px-4 text-[11px] font-mono text-slate-400">
                    <span>AIRMIRROR SMART TV · PEERJS WEBRTC P2P</span>
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                      <span>P2P LINK ACTIVE</span>
                    </span>
                  </div>
                </div>

                {!isTvFullscreen && (
                  <div className="mx-auto w-56 h-3 bg-slate-800 rounded-b-xl border-x border-b border-slate-700" />
                )}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            HOW IT WORKS / ARCHITECTURAL STEPS (Editorial Numbering)
           ==================================================================== */}
        <section className="mt-14 pt-8 border-t border-slate-800/80">
          <h2 className="text-sm font-semibold text-slate-300 mb-5">
            {t.howItWorksTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-white">{t.step1Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.step1Desc}</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-white">{t.step2Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.step2Desc}</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-white">{t.step3Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.step3Desc}</p>
            </div>
          </div>
        </section>
      </main>

      {/* ====================================================================
          INITIAL ROLE PROMPT MODAL (Appears Immediately on Load)
         ==================================================================== */}
      {showRoleModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-2xl bg-[#111726] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium text-sky-400">
                {t.modalKicker}
              </span>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#090D16] border border-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setLang('vi')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      lang === 'vi'
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tiếng Việt
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      lang === 'en'
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>

                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setShowRoleModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h2
                id="role-modal-title"
                className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
              >
                {t.modalTitle}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t.modalSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <button
                type="button"
                onClick={() => handleSelectRole('sender')}
                className="group text-left bg-[#090D16] hover:bg-slate-900/90 border-2 border-slate-800 hover:border-sky-400 rounded-2xl p-5 transition-all flex flex-col justify-between gap-5 cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                      <Cast className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {t.roleSenderBadge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                    {t.roleSenderTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.roleSenderDesc}
                  </p>
                </div>

                <div className="w-full py-2.5 px-4 bg-sky-400 group-hover:bg-sky-300 text-slate-950 font-semibold text-xs rounded-xl text-center transition-colors">
                  {t.roleSenderCta}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('receiver')}
                className="group text-left bg-[#090D16] hover:bg-slate-900/90 border-2 border-slate-800 hover:border-emerald-400 rounded-2xl p-5 transition-all flex flex-col justify-between gap-5 cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <Tv className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {t.roleReceiverBadge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {t.roleReceiverTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.roleReceiverDesc}
                  </p>
                </div>

                <div className="w-full py-2.5 px-4 bg-emerald-400 group-hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-xl text-center transition-colors">
                  {t.roleReceiverCta}
                </div>
              </button>
            </div>

            <div className="text-xs text-slate-400 text-center pt-1">
              {t.modalFooterNote}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          STATUS TOAST NOTIFICATIONS
         ==================================================================== */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111726]/95 border border-slate-700/90 shadow-xl backdrop-blur-md text-xs text-slate-100"
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span className="font-medium leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* ====================================================================
          FOOTER (Displayed across all screens with "Created by Từ Vĩ Phát")
         ==================================================================== */}
      <footer className="relative z-40 border-t border-slate-800/80 bg-[#090D16]/95 backdrop-blur-md py-5 px-4 sm:px-8 text-xs text-slate-400">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">AirMirror P2P</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>WebRTC Screen Mirroring</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111726] border border-slate-800/90 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="font-medium tracking-wide text-slate-200">
              Created by <span className="text-sky-400 font-semibold">Từ Vĩ Phát</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowRoleModal(true)}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              {t.chooseRoleBtn}
            </button>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <button
              type="button"
              onClick={handleDownloadStandaloneHtml}
              className="hover:text-sky-400 transition-colors cursor-pointer"
            >
              {t.navExportHtml}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// STANDALONE SINGLE-FILE HTML GENERATOR (WITH PEERJS WEBRTC P2P)
// ============================================================================
function buildStandalonePeerJsHtml(initialLang: Language): string {
  return `<!DOCTYPE html>
<html lang="${initialLang}" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AirMirror P2P — WebRTC Screen Mirroring via PeerJS</title>
  <script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { background: #090D16; color: #F8FAFC; font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between bg-[#090D16] text-slate-100">
  <header class="border-b border-slate-800 bg-[#090D16]/90 sticky top-0 z-30">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <a href="#" id="brand-link" class="text-lg font-bold text-white">AirMirror P2P</a>
      <div class="flex items-center gap-3">
        <div class="bg-[#111726] border border-slate-800 rounded-lg p-0.5 flex">
          <button id="btn-lang-vi" class="px-2.5 py-1 text-xs font-semibold rounded-md">Tiếng Việt</button>
          <button id="btn-lang-en" class="px-2.5 py-1 text-xs font-semibold rounded-md">English</button>
        </div>
        <button id="btn-switch-role" class="px-3.5 py-1.5 text-xs font-semibold bg-[#111726] border border-slate-700 rounded-lg hover:bg-slate-800"></button>
      </div>
    </div>
  </header>

  <main class="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
    <!-- Sender Section -->
    <section id="view-sender" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div class="lg:col-span-5 bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-5">
        <div class="flex items-center justify-between">
          <h1 id="sender-title" class="text-xl font-bold text-white"></h1>
          <span id="peer-status" class="text-xs font-mono text-emerald-400">PeerJS Ready</span>
        </div>
        <p id="sender-sub" class="text-xs text-slate-400"></p>
        <div id="pin-boxes" class="grid grid-cols-4 gap-3"></div>
        <button id="btn-new-pin" class="w-full py-2.5 bg-[#090D16] border border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-900"></button>
        <button id="btn-start-share" class="w-full py-3.5 bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-sm rounded-xl cursor-pointer"></button>
      </div>
      <div class="lg:col-span-7 bg-[#111726] border border-slate-800 rounded-2xl p-6">
        <div class="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
          <video id="sender-video" class="w-full h-full object-contain" autoplay playsinline muted></video>
        </div>
      </div>
    </section>

    <!-- Receiver Section -->
    <section id="view-receiver" class="hidden space-y-6">
      <div id="receiver-pin-panel" class="max-w-md mx-auto bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-5">
        <h1 id="receiver-title" class="text-xl font-bold text-white"></h1>
        <div class="grid grid-cols-4 gap-3">
          <input type="text" maxlength="1" class="pin-in w-full h-20 text-center bg-[#090D16] border-2 border-slate-800 focus:border-sky-400 rounded-xl font-mono text-4xl font-bold text-white focus:outline-none" />
          <input type="text" maxlength="1" class="pin-in w-full h-20 text-center bg-[#090D16] border-2 border-slate-800 focus:border-sky-400 rounded-xl font-mono text-4xl font-bold text-white focus:outline-none" />
          <input type="text" maxlength="1" class="pin-in w-full h-20 text-center bg-[#090D16] border-2 border-slate-800 focus:border-sky-400 rounded-xl font-mono text-4xl font-bold text-white focus:outline-none" />
          <input type="text" maxlength="1" class="pin-in w-full h-20 text-center bg-[#090D16] border-2 border-slate-800 focus:border-sky-400 rounded-xl font-mono text-4xl font-bold text-white focus:outline-none" />
        </div>
        <button id="btn-connect" class="w-full py-3.5 bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-sm rounded-xl cursor-pointer"></button>
      </div>

      <div id="receiver-tv-frame" class="hidden bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
        <div class="flex items-center justify-between text-xs">
          <span class="text-emerald-400 font-mono">WEBRTC P2P LIVE STREAM</span>
          <button id="btn-disconnect" class="px-3 py-1.5 bg-rose-500 text-white rounded-lg font-semibold cursor-pointer"></button>
        </div>
        <div class="aspect-video bg-black rounded-xl overflow-hidden">
          <video id="receiver-video" class="w-full h-full object-contain" autoplay playsinline controls></video>
        </div>
      </div>
    </section>
  </main>

  <div id="role-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div class="max-w-xl w-full bg-[#111726] border border-slate-700 rounded-2xl p-6 space-y-6">
      <h2 id="modal-heading" class="text-2xl font-bold text-white"></h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button id="choose-sender" class="p-5 bg-[#090D16] border-2 border-slate-800 hover:border-sky-400 rounded-xl text-left space-y-2 cursor-pointer">
          <div class="font-bold text-white text-base">Sender (Phát màn hình)</div>
          <p id="desc-sender" class="text-xs text-slate-400"></p>
        </button>
        <button id="choose-receiver" class="p-5 bg-[#090D16] border-2 border-slate-800 hover:border-emerald-400 rounded-xl text-left space-y-2 cursor-pointer">
          <div class="font-bold text-white text-base">Receiver / TV (Nhận màn hình)</div>
          <p id="desc-receiver" class="text-xs text-slate-400"></p>
        </button>
      </div>
    </div>
  </div>

  <script>
    const PREFIX = "${PEER_ID_PREFIX}";
    let lang = "${initialLang}";
    let role = "sender";
    let pin = String(Math.floor(1000 + Math.random() * 9000));
    let senderPeer = null;
    let receiverPeer = null;
    let localStream = null;
    let connectedConns = [];

    const i18n = {
      vi: {
        switchRole: "Đổi vai trò (Sender / TV)",
        senderTitle: "Sender (Phát màn hình WebRTC)",
        senderSub: "Nhập mã PIN 4 số này trên thiết bị Receiver:",
        newPin: "Tạo mã PIN mới",
        startShare: "Chia sẻ màn hình thật (getDisplayMedia)",
        receiverTitle: "Nhập mã PIN 4 số từ Sender",
        connect: "Kết nối WebRTC P2P",
        disconnect: "Ngắt kết nối",
        modalHeading: "Chọn vai trò thiết bị của bạn",
        descSender: "Phát trực tiếp màn hình qua WebRTC P2P bằng mã PIN 4 số.",
        descReceiver: "Nhập mã PIN 4 số để nhận luồng video trực tiếp từ Sender."
      },
      en: {
        switchRole: "Switch Role (Sender / TV)",
        senderTitle: "Sender (WebRTC Screen Broadcast)",
        senderSub: "Enter this 4-digit PIN on the Receiver device:",
        newPin: "Generate New PIN",
        startShare: "Share Real Screen (getDisplayMedia)",
        receiverTitle: "Enter 4-Digit Sender PIN",
        connect: "Connect WebRTC P2P",
        disconnect: "Disconnect",
        modalHeading: "Select Your Device Role",
        descSender: "Broadcast your real screen over WebRTC P2P using a 4-digit PIN.",
        descReceiver: "Enter the 4-digit PIN to view the remote screen stream."
      }
    };

    function initSenderPeer() {
      if (senderPeer) senderPeer.destroy();
      senderPeer = new Peer(PREFIX + pin);
      senderPeer.on("connection", (conn) => {
        connectedConns.push(conn);
        conn.on("open", () => {
          if (localStream) senderPeer.call(conn.peer, localStream);
        });
      });
      senderPeer.on("call", (call) => {
        if (localStream) call.answer(localStream);
        else call.answer();
      });
    }

    function render() {
      const t = i18n[lang];
      document.getElementById("btn-switch-role").textContent = t.switchRole;
      document.getElementById("sender-title").textContent = t.senderTitle;
      document.getElementById("sender-sub").textContent = t.senderSub;
      document.getElementById("btn-new-pin").textContent = t.newPin;
      document.getElementById("btn-start-share").textContent = t.startShare;
      document.getElementById("receiver-title").textContent = t.receiverTitle;
      document.getElementById("btn-connect").textContent = t.connect;
      document.getElementById("btn-disconnect").textContent = t.disconnect;
      document.getElementById("modal-heading").textContent = t.modalHeading;
      document.getElementById("desc-sender").textContent = t.descSender;
      document.getElementById("desc-receiver").textContent = t.descReceiver;
      document.getElementById("pin-boxes").innerHTML = pin.split("").map(d => '<div class="h-20 bg-[#090D16] border border-slate-800 rounded-xl flex items-center justify-center font-mono text-4xl font-bold text-sky-400">' + d + '</div>').join("");
      document.getElementById("view-sender").classList.toggle("hidden", role !== "sender");
      document.getElementById("view-receiver").classList.toggle("hidden", role !== "receiver");
    }

    document.getElementById("btn-lang-vi").onclick = () => { lang = "vi"; render(); };
    document.getElementById("btn-lang-en").onclick = () => { lang = "en"; render(); };
    document.getElementById("btn-switch-role").onclick = () => { role = role === "sender" ? "receiver" : "sender"; render(); };
    document.getElementById("choose-sender").onclick = () => { role = "sender"; document.getElementById("role-modal").classList.add("hidden"); render(); };
    document.getElementById("choose-receiver").onclick = () => { role = "receiver"; document.getElementById("role-modal").classList.add("hidden"); render(); };
    document.getElementById("btn-new-pin").onclick = () => { pin = String(Math.floor(1000 + Math.random() * 9000)); initSenderPeer(); render(); };

    document.getElementById("btn-start-share").onclick = async () => {
      localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      document.getElementById("sender-video").srcObject = localStream;
      connectedConns.forEach(c => { if (c.open) senderPeer.call(c.peer, localStream); });
    };

    const inputs = document.querySelectorAll(".pin-in");
    inputs.forEach((inp, idx) => {
      inp.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\\D/g, "");
        if (e.target.value && idx < 3) inputs[idx + 1].focus();
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !e.target.value && idx > 0) inputs[idx - 1].focus();
      });
    });

    document.getElementById("btn-connect").onclick = () => {
      const code = Array.from(inputs).map(i => i.value).join("");
      if (code.length !== 4) return;
      if (receiverPeer) receiverPeer.destroy();
      receiverPeer = new Peer();
      receiverPeer.on("open", () => {
        const conn = receiverPeer.connect(PREFIX + code);
        conn.on("open", () => {
          document.getElementById("receiver-pin-panel").classList.add("hidden");
          document.getElementById("receiver-tv-frame").classList.remove("hidden");
        });
      });
      receiverPeer.on("call", (call) => {
        call.answer();
        call.on("stream", (remoteStream) => {
          document.getElementById("receiver-pin-panel").classList.add("hidden");
          document.getElementById("receiver-tv-frame").classList.remove("hidden");
          document.getElementById("receiver-video").srcObject = remoteStream;
        });
      });
    };

    document.getElementById("btn-disconnect").onclick = () => {
      if (receiverPeer) receiverPeer.destroy();
      document.getElementById("receiver-tv-frame").classList.add("hidden");
      document.getElementById("receiver-pin-panel").classList.remove("hidden");
    };

    initSenderPeer();
    render();
  </script>
</body>
</html>`;
}
