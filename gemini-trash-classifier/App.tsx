
import React, { useState, useRef, useEffect } from 'react';
import { analyzeTrash, TrashAnalysisResult } from './services/geminiService';

// --- 아이콘 컴포넌트들 (이전과 동일) ---
const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);
const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);
const WifiIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>
);
const Trash2Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
);
const RecycleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 19H4.5a1.5 1.5 0 0 1 0-3H7" /><path d="M11 19h8.5a1.5 1.5 0 0 0 0-3H11" /><path d="M11 16H7" /><path d="m14 13 3 3 3-3" /><path d="M10.5 13H4.5a1.5 1.5 0 0 1 0-3h6" /><path d="m14 7 3-3 3 3" /><path d="M17 10V4" /><path d="M17 13v6" /></svg>
);


const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<TrashAnalysisResult | null>(null);
    const [error, setError] = useState<string>('');
    const [trashCounts, setTrashCounts] = useState({ general: 0, recyclable: 0 });
    const [picoIp, setPicoIp] = useState<string>('');
    const [tempIp, setTempIp] = useState<string>('');
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected'>('disconnected');
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                stream = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("카메라 접근 오류:", err);
                setError("카메라에 접근할 수 없습니다. 권한을 확인해주세요.");
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleIpSave = () => {
        if (tempIp.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
            setPicoIp(tempIp);
            setConnectionStatus('connected');
            setError(''); // Clear previous errors

            if (window.location.protocol === 'https:') {
                setError("⚠️ 경고: 혼합 콘텐츠(Mixed Content)\n현재 앱은 안전한 https 환경에서 실행 중입니다. 브라우저 보안 정책에 따라 http 기기(Pico W)로의 요청이 차단될 수 있습니다.\n\n작동하지 않는 경우, 이 앱을 http 환경에서 실행해 주세요.");
            }
        } else {
            setError('유효한 IP 주소 형식이 아닙니다.');
            setConnectionStatus('disconnected');
            setPicoIp('');
        }
    };

    const sendNetworkCommand = async (command: string) => {
        if (!picoIp) {
            setError('Pico W의 IP 주소가 설정되지 않았습니다.');
            return;
        }
        try {
            // CORS 문제를 피하기 위해 'no-cors' 모드를 사용합니다.
            // 피코 W는 실제 응답 본문을 보내지 않으므로, 요청 성공 여부만 확인하면 됩니다.
            await fetch(`http://${picoIp}/${command}`, { method: 'GET', mode: 'no-cors' });
        } catch(e) {
            console.error("Network command error:", e);
            const detailedError = "❌ 연결 실패: 브라우저 보안 정책(혼합 콘텐츠)으로 인해 https 페이지에서 http 기기(Pico W)로의 요청이 차단되었습니다.\n\n이 문제를 해결하려면, 이 웹 애플리케이션을 http 환경에서 실행해야 합니다.";
            setError(detailedError);
            setConnectionStatus('disconnected');
        }
    };

    const handleCaptureAndAnalyze = async () => {
        if (!videoRef.current) {
            setError("웹캠이 준비되지 않았습니다.");
            return;
        }

        setIsLoading(true);
        setResult(null);
        setError('');

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) {
             setError("이미지를 캡처할 수 없습니다.");
             setIsLoading(false);
             return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        const base64ImageData = imageDataUrl.split(',')[1];
        
        try {
            const analysisResult = await analyzeTrash(base64ImageData);
            setResult(analysisResult);

            if (analysisResult.category === '일반 쓰레기') {
                setTrashCounts(prev => ({ ...prev, general: prev.general + 1 }));
                if (connectionStatus === 'connected') await sendNetworkCommand('MOTOR2');
            } else if (analysisResult.category === '재활용') {
                setTrashCounts(prev => ({ ...prev, recyclable: prev.recyclable + 1 }));
                if (connectionStatus === 'connected') await sendNetworkCommand('MOTOR1');
            }
        } catch (e) {
            console.error(e);
            setError("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const getStatusInfo = () => {
        switch (connectionStatus) {
            case 'connected': return { text: `연결됨 (${picoIp})`, color: 'text-green-500' };
            default: return { text: '연결 끊김', color: 'text-gray-500' };
        }
    };
    
    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 transition-colors duration-300">
            <header className="w-full max-w-4xl text-center my-8">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">Gemini 무선 쓰레기 분류 시스템</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">실시간 웹캠으로 쓰레기를 분류하고 무선으로 제어하세요.</p>
            </header>

            <main className="w-full max-w-4xl flex-grow grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 제어판 및 통계 */}
                <div className="flex flex-col gap-8">
                    {/* 기기 연결 카드 */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">네트워크 제어</h2>
                        <div className="flex items-center gap-4">
                            <input 
                                type="text"
                                placeholder="Pico W IP 주소 입력 (예: 192.168.1.5)"
                                value={tempIp}
                                onChange={(e) => setTempIp(e.target.value)}
                                className="flex-grow p-2 border rounded-lg bg-gray-100 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleIpSave}
                                className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
                            >
                                <WifiIcon className="w-5 h-5" />
                                <span>저장</span>
                            </button>
                        </div>
                         <p className={`mt-2 font-semibold ${getStatusInfo().color}`}>상태: {getStatusInfo().text}</p>
                    </div>

                    {/* 쓰레기 기록 카드 */}
                     <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">쓰레기 기록</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Trash2Icon className="w-6 h-6 text-gray-600 dark:text-gray-300"/>
                                    <span className="text-lg font-medium">일반 쓰레기</span>
                                </div>
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{trashCounts.general}</span>
                            </div>
                             <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <RecycleIcon className="w-6 h-6 text-green-500"/>
                                    <span className="text-lg font-medium">재활용</span>
                                </div>
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{trashCounts.recyclable}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 분석 섹션 */}
                <div className="flex flex-col gap-8">
                     {/* 웹캠 및 캡처 */}
                    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col gap-4">
                         <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative flex items-center justify-center">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover"
                            />
                            {!videoRef.current?.srcObject && <p className="text-gray-500 dark:text-gray-400 absolute">카메라를 시작하는 중...</p>}
                        </div>
                        <button
                            onClick={handleCaptureAndAnalyze}
                            disabled={isLoading || connectionStatus !== 'connected'}
                            className="w-full flex items-center justify-center gap-3 bg-green-600 text-white font-bold py-4 px-6 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <CameraIcon className="w-6 h-6" />
                            <span>{isLoading ? '분석 중...' : '캡처 및 분석'}</span>
                        </button>
                    </div>

                    {/* 분석 결과 카드 */}
                    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 min-h-[200px] flex items-center justify-center">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
                                <SpinnerIcon className="w-10 h-10 animate-spin" />
                                <span className="text-lg">분석 중입니다...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-500 whitespace-pre-wrap">
                                <h3 className="font-bold text-lg">오류 발생</h3>
                                <p>{error}</p>
                            </div>
                        ) : result ? (
                             <div className="text-left w-full space-y-2 prose dark:prose-invert">
                                <h3 className="text-xl font-bold !mb-2 text-gray-900 dark:text-white">
                                    분류: <span className={result.category === '재활용' ? 'text-green-500' : 'text-gray-500'}>{result.category}</span>
                                </h3>
                                <p className="!my-1"><span className="font-semibold">물체:</span> {result.object}</p>
                                <p className="!my-1"><span className="font-semibold">배출 방법:</span> {result.reason}</p>
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-center">피코 W의 IP 주소를 입력하고 '캡처 및 분석' 버튼을 누르세요.</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
