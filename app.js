document.addEventListener('DOMContentLoaded', () => {
    // Supabase 초기화
    const SUPABASE_URL = 'https://lqoxdkoaaqljhvlezwap.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_w5d9UK56HBpxTODCKqWc8Q_A3FpgmAz';
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const appContent = document.getElementById('app-content');
    const navButtons = document.querySelectorAll('.nav-btn');
    const btnCreateSchedule = document.getElementById('btn-create-schedule');
    const modalContainer = document.getElementById('modal-container');
    const modalContent = document.getElementById('modal-content');
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    let currentView = 'schedules';
    let currentUser = null;
    let schedules = [];
    let tournaments = [];
    let currentChatChannel = null;

    const DIVISIONS = ['선수부', '지역 1부', '지역 2부', '지역 3부', '지역 4부', '지역 5부', '지역 6부', '초심 (7부 이하)'];

    // ─── 토스트 알림 헬퍼 ──────────────────────────────────
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        const bgColors = {
            success: 'bg-emerald-600 text-white shadow-emerald-500/20',
            error: 'bg-rose-600 text-white shadow-rose-500/20',
            info: 'bg-slate-800 text-white shadow-slate-700/20'
        };
        const icons = {
            success: '<i class="fa-solid fa-circle-check text-emerald-200 mr-2"></i>',
            error: '<i class="fa-solid fa-circle-exclamation text-rose-200 mr-2"></i>',
            info: '<i class="fa-solid fa-circle-info text-blue-300 mr-2"></i>'
        };
        toast.className = `flex items-center px-4 py-2.5 rounded-xl shadow-lg text-xs sm:text-sm font-semibold border border-white/10 ${bgColors[type] || bgColors.info} toast-animate-in pointer-events-auto transition-all`;
        toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('toast-animate-in');
            toast.classList.add('toast-animate-out');
            setTimeout(() => toast.remove(), 250);
        }, 2600);
    }

    // ─── 인증 ──────────────────────────────────────────────
    async function checkAuth() {
        try {
            const userId = localStorage.getItem('loggedInUser');
            if (userId) {
                const { data, error } = await sb.from('users').select('*').eq('id', userId).single();
                if (data) {
                    currentUser = data;
                    showApp();
                    return;
                }
                localStorage.removeItem('loggedInUser');
            }
        } catch (err) {
            console.error('인증 확인 중 오류 발생:', err);
        }
        showLogin();
    }

    function showApp() {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        loadView(currentView);
    }

    function showLogin() {
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        authContainer.innerHTML = `
            <div class="w-full max-w-sm bg-white p-7 rounded-3xl shadow-xl border border-slate-100 transition-all">
                <div class="text-center mb-7">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 mb-3.5">
                        <i class="fa-solid fa-table-tennis-paddle-ball text-2xl"></i>
                    </div>
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight">핑퐁메이트</h2>
                    <p class="text-xs text-slate-500 mt-1 font-medium">탁구 번개 모임 & 전국 대회 공유 플랫폼</p>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">아이디</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                                <i class="fa-regular fa-user text-sm"></i>
                            </span>
                            <input type="text" id="login-id" class="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="아이디를 입력하세요">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">비밀번호</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                                <i class="fa-solid fa-lock text-sm"></i>
                            </span>
                            <input type="password" id="login-pw" class="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="비밀번호를 입력하세요">
                        </div>
                    </div>
                    <button id="btn-login" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2">
                        <span>로그인</span>
                        <i class="fa-solid fa-arrow-right text-xs"></i>
                    </button>
                    <div class="text-center text-xs text-slate-500 pt-2">
                        계정이 없으신가요? 
                        <button id="btn-go-register" class="text-blue-600 font-bold hover:underline ml-1">회원가입</button>
                    </div>
                </div>
            </div>`;

        document.getElementById('btn-login').addEventListener('click', async () => {
            const id = document.getElementById('login-id').value.trim();
            const pw = document.getElementById('login-pw').value.trim();
            if (!id || !pw) {
                showToast('아이디와 비밀번호를 입력해주세요.', 'error');
                return;
            }
            const btn = document.getElementById('btn-login');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 로그인 중...';
            try {
                const { data, error } = await sb.from('users').select('*').eq('id', id).eq('password', pw).single();
                if (data) {
                    localStorage.setItem('loggedInUser', id);
                    currentUser = data;
                    showToast(`${data.nickname}님, 환영합니다!`, 'success');
                    showApp();
                } else {
                    showToast('아이디 또는 비밀번호가 올바르지 않습니다.', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<span>로그인</span><i class="fa-solid fa-arrow-right text-xs"></i>';
                }
            } catch (err) {
                showToast('로그인 처리 중 오류가 발생했습니다.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<span>로그인</span><i class="fa-solid fa-arrow-right text-xs"></i>';
            }
        });

        // 엔터키 로그인 지원
        const handleEnter = (e) => {
            if (e.key === 'Enter') document.getElementById('btn-login').click();
        };
        document.getElementById('login-id').addEventListener('keypress', handleEnter);
        document.getElementById('login-pw').addEventListener('keypress', handleEnter);
        document.getElementById('btn-go-register').addEventListener('click', showRegister);
    }

    function showRegister() {
        authContainer.innerHTML = `
            <div class="w-full max-w-sm bg-white p-7 rounded-3xl shadow-xl border border-slate-100 my-4 transition-all">
                <div class="text-center mb-6">
                    <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-2">
                        <i class="fa-solid fa-user-plus text-xl"></i>
                    </div>
                    <h2 class="text-xl font-black text-slate-800 tracking-tight">회원가입</h2>
                    <p class="text-xs text-slate-500 mt-0.5">탁구 메이트 모임에 지금 함께하세요!</p>
                </div>
                <div class="space-y-3.5">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">아이디</label>
                        <input type="text" id="reg-id" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="사용할 아이디">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">비밀번호</label>
                        <input type="password" id="reg-pw" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="비밀번호">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">비밀번호 확인</label>
                        <input type="password" id="reg-pw-confirm" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="비밀번호 재입력">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">닉네임</label>
                        <input type="text" id="reg-nickname" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="탁구장에서 불릴 닉네임">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">지역 부수 (실력 등급)</label>
                        <div class="relative">
                            <select id="reg-division" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50 appearance-none">
                                ${DIVISIONS.map(d => `<option value="${d}">${d}</option>`).join('')}
                            </select>
                            <span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                <i class="fa-solid fa-chevron-down text-xs"></i>
                            </span>
                        </div>
                    </div>
                    <button id="btn-register" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2">
                        <span>가입 완료하기</span>
                    </button>
                    <div class="text-center text-xs text-slate-500 pt-1">
                        <button id="btn-go-login" class="text-slate-600 hover:text-blue-600 font-semibold flex items-center justify-center gap-1 mx-auto">
                            <i class="fa-solid fa-arrow-left text-[10px]"></i> 로그인으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>`;

        document.getElementById('btn-register').addEventListener('click', async () => {
            const id = document.getElementById('reg-id').value.trim();
            const pw = document.getElementById('reg-pw').value.trim();
            const pwConfirm = document.getElementById('reg-pw-confirm').value.trim();
            const nickname = document.getElementById('reg-nickname').value.trim();
            const division = document.getElementById('reg-division').value;

            if (!id || !pw || !pwConfirm || !nickname) {
                showToast('모든 필수 항목을 입력해주세요.', 'error');
                return;
            }
            if (pw !== pwConfirm) {
                showToast('비밀번호가 일치하지 않습니다.', 'error');
                return;
            }

            const btn = document.getElementById('btn-register');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 처리 중...';

            try {
                const { data: existing } = await sb.from('users').select('id').eq('id', id).single();
                if (existing) {
                    showToast('이미 존재하는 아이디입니다.', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<span>가입 완료하기</span>';
                    return;
                }
                const { error } = await sb.from('users').insert({ id, password: pw, nickname, division });
                if (error) {
                    showToast('회원가입 실패: ' + error.message, 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<span>가입 완료하기</span>';
                } else {
                    showToast('회원가입이 완료되었습니다! 로그인해주세요.', 'success');
                    showLogin();
                }
            } catch (err) {
                showToast('회원가입 중 오류가 발생했습니다.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<span>가입 완료하기</span>';
            }
        });
        document.getElementById('btn-go-login').addEventListener('click', showLogin);
    }

    // ─── 네비게이션 ────────────────────────────────────────
    function setupNavigation() {
        navButtons.forEach(btn => {
            btn.addEventListener('click', e => {
                const target = e.currentTarget.dataset.target;
                navButtons.forEach(b => {
                    b.classList.remove('text-blue-600');
                    b.classList.add('text-slate-400');
                    const label = b.querySelector('span');
                    if (label) label.className = 'text-[11px] font-medium tracking-tight';
                });
                e.currentTarget.classList.remove('text-slate-400');
                e.currentTarget.classList.add('text-blue-600');
                const activeLabel = e.currentTarget.querySelector('span');
                if (activeLabel) activeLabel.className = 'text-[11px] font-bold tracking-tight';
                loadView(target);
            });
        });
        btnCreateSchedule.addEventListener('click', openCreateScheduleModal);
        modalContainer.addEventListener('click', e => { if (e.target === modalContainer) closeModal(); });
    }

    function showLoading() {
        appContent.innerHTML = `
            <div class="flex flex-col justify-center items-center h-64 text-slate-400">
                <div class="w-10 h-10 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                <p class="text-xs font-medium">데이터를 불러오는 중입니다...</p>
            </div>`;
    }

    async function loadView(viewName) {
        currentView = viewName;
        showLoading();
        try {
            if (viewName === 'schedules') {
                btnCreateSchedule.classList.remove('hidden');
                btnCreateSchedule.classList.add('flex');
                const { data, error } = await sb.from('schedules').select(`*, participants(user_id, users(nickname, division))`).order('created_at', { ascending: false });
                if (error) throw error;
                schedules = (data || []).map(s => ({
                    ...s,
                    participants: s.participants ? s.participants.map(p => ({ id: p.user_id, nickname: p.users?.nickname || '?', division: p.users?.division || '' })) : []
                }));
                renderSchedules();
            } else if (viewName === 'tournaments') {
                btnCreateSchedule.classList.add('hidden');
                btnCreateSchedule.classList.remove('flex');
                const { data, error } = await sb.from('tournaments').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                tournaments = data || [];
                renderTournaments();
            } else if (viewName === 'profile') {
                btnCreateSchedule.classList.add('hidden');
                btnCreateSchedule.classList.remove('flex');
                renderProfile();
            }
        } catch (err) {
            console.error('데이터 로드 오류:', err);
            appContent.innerHTML = `
                <div class="text-center py-16 px-4">
                    <div class="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h3 class="font-bold text-slate-800 text-sm mb-1">데이터를 불러오지 못했습니다</h3>
                    <p class="text-xs text-slate-500 mb-4">네트워크 상태를 확인하고 다시 시도해주세요.</p>
                    <button onclick="location.reload()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all">
                        새로고침
                    </button>
                </div>`;
        }
    }

    // ─── 일정 뷰 ───────────────────────────────────────────
    function renderSchedules() {
        appContent.innerHTML = '';
        if (!schedules.length) {
            appContent.innerHTML = `
                <div class="py-16 px-4 text-center flex flex-col items-center justify-center">
                    <div class="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-4 shadow-sm">
                        <i class="fa-solid fa-table-tennis-paddle-ball"></i>
                    </div>
                    <h3 class="font-black text-slate-800 text-base mb-1.5">등록된 일정이 없습니다</h3>
                    <p class="text-xs text-slate-500 mb-6 max-w-xs leading-relaxed">첫 번째 탁구 모임을 만들고 함께 땀 흘릴 메이트를 모집해보세요!</p>
                    <button id="btn-empty-sch" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center gap-2">
                        <i class="fa-solid fa-plus text-xs"></i>
                        <span>첫 일정 만들기</span>
                    </button>
                </div>`;
            document.getElementById('btn-empty-sch')?.addEventListener('click', openCreateScheduleModal);
            return;
        }

        // 상단 카운트 및 상태 안내 바
        const topBar = document.createElement('div');
        topBar.className = 'flex justify-between items-center mb-3 px-1';
        topBar.innerHTML = `
            <div class="flex items-center space-x-2">
                <span class="text-xs font-extrabold text-slate-700">진행 중인 모임</span>
                <span class="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full">${schedules.length}</span>
            </div>
            <span class="text-[11px] text-slate-400 font-medium">실시간 업데이트</span>`;
        appContent.appendChild(topBar);

        const list = document.createElement('div');
        list.className = 'space-y-3.5';
        schedules.forEach(sch => {
            const isFull = sch.participants.length >= sch.max_participants;
            const isCancelled = sch.status === 'cancelled';
            const badge = isCancelled 
                ? '<span class="bg-rose-50 text-rose-600 border border-rose-200/80 text-[11px] px-2.5 py-0.5 rounded-full font-bold">취소됨</span>'
                : isFull 
                    ? '<span class="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-0.5 rounded-full font-bold">마감</span>'
                    : '<span class="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot"></span>모집중</span>';

            const card = document.createElement('div');
            card.className = `bg-white p-4.5 rounded-2xl shadow-sm border border-slate-100/90 hover:shadow-md transition-all active:scale-[0.99] duration-150 cursor-pointer space-y-3 ${isCancelled ? 'opacity-60 bg-slate-50' : ''}`;
            
            // 날짜 포맷팅 및 요일 계산
            let dateDisplay = sch.date;
            try {
                const dateObj = new Date(sch.date);
                const days = ['일', '월', '화', '수', '목', '금', '토'];
                const dayName = days[dateObj.getDay()];
                if (dayName) dateDisplay = `${sch.date} (${dayName})`;
            } catch (e) {}

            card.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1">
                                <i class="fa-regular fa-calendar text-[10px]"></i>
                                ${dateDisplay} ${sch.time}
                            </span>
                        </div>
                        <h3 class="font-extrabold text-slate-900 text-base leading-snug truncate">${sch.title}</h3>
                    </div>
                    <div class="flex-shrink-0 pt-0.5">${badge}</div>
                </div>
                <div class="flex items-center text-xs text-slate-500 gap-1.5">
                    <i class="fa-solid fa-location-dot text-slate-400 text-xs flex-shrink-0"></i>
                    <span class="truncate">${sch.location}</span>
                </div>
                <div class="flex justify-between items-center pt-2.5 border-t border-slate-100">
                    <div class="flex items-center -space-x-2 overflow-hidden py-0.5">
                        ${sch.participants.slice(0, 5).map((p, idx) => {
                            const colors = ['from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600', 'from-purple-500 to-pink-600', 'from-cyan-500 to-blue-600'];
                            const color = colors[idx % colors.length];
                            return `<div class="h-7 w-7 rounded-full ring-2 ring-white bg-gradient-to-br ${color} text-white flex items-center justify-center text-[11px] font-black shadow-sm" title="${p.nickname}">${p.nickname[0]}</div>`;
                        }).join('')}
                        ${sch.participants.length > 5 ? `<div class="h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">+${sch.participants.length - 5}</div>` : ''}
                    </div>
                    <div class="flex items-center gap-1.5 text-xs">
                        <span class="font-extrabold text-blue-600">${sch.participants.length}</span>
                        <span class="text-slate-400 font-medium">/ ${sch.max_participants}명</span>
                    </div>
                </div>`;
            card.addEventListener('click', () => openScheduleDetail(sch.id));
            list.appendChild(card);
        });
        appContent.appendChild(list);
    }

    // ─── 대회 뷰 ───────────────────────────────────────────
    function renderTournaments() {
        appContent.innerHTML = '';

        // 상단 배너 카드
        const topBar = document.createElement('div');
        topBar.className = 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white rounded-2xl p-4.5 mb-4 shadow-lg shadow-blue-500/20 flex justify-between items-center';
        topBar.innerHTML = `
            <div>
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">TOURNAMENT</span>
                <h2 class="text-base font-black mt-0.5">전국 탁구대회 소식</h2>
            </div>
            <button id="btn-create-tournament" class="bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 shadow-sm">
                <i class="fa-solid fa-bullhorn text-xs"></i>
                <span>대회 홍보</span>
            </button>`;
        appContent.appendChild(topBar);

        if (!tournaments.length) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'py-16 px-4 text-center flex flex-col items-center justify-center';
            emptyDiv.innerHTML = `
                <div class="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl mb-4 shadow-sm">
                    <i class="fa-solid fa-trophy"></i>
                </div>
                <h3 class="font-black text-slate-800 text-base mb-1.5">등록된 대회가 없습니다</h3>
                <p class="text-xs text-slate-500 mb-5">동호인 탁구대회나 오픈 대회 정보를 직접 홍보해보세요!</p>`;
            appContent.appendChild(emptyDiv);
            document.getElementById('btn-create-tournament')?.addEventListener('click', openCreateTournamentModal);
            return;
        }

        const list = document.createElement('div');
        list.className = 'space-y-3.5';
        tournaments.forEach(trn => {
            const card = document.createElement('div');
            card.className = 'bg-white p-4.5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-[0.99] duration-150 cursor-pointer space-y-2.5';
            card.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center text-xs flex-shrink-0">
                            <i class="fa-solid fa-trophy"></i>
                        </span>
                        <h3 class="font-extrabold text-slate-900 text-base leading-snug line-clamp-1">${trn.name}</h3>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-300 text-xs pt-1"></i>
                </div>
                <div class="space-y-1.5 text-xs text-slate-600 pl-9">
                    <p class="flex items-center gap-1.5">
                        <i class="fa-regular fa-calendar text-slate-400 text-xs w-4"></i>
                        <span class="font-medium text-slate-700">대회일:</span>
                        <span class="font-bold text-slate-900">${trn.date}</span>
                    </p>
                    <p class="flex items-center gap-1.5">
                        <i class="fa-solid fa-location-dot text-slate-400 text-xs w-4"></i>
                        <span class="truncate">${trn.location}</span>
                    </p>
                </div>
                ${trn.reward || trn.fee ? `
                    <div class="flex flex-wrap gap-1.5 pt-2 pl-9">
                        ${trn.fee ? `<span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">참가비 ${trn.fee}</span>` : ''}
                        ${trn.reward ? `<span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold"><i class="fa-solid fa-gift mr-1 text-[9px]"></i>${trn.reward}</span>` : ''}
                    </div>` : ''}
            `;
            card.addEventListener('click', () => openTournamentDetail(trn.id));
            list.appendChild(card);
        });
        appContent.appendChild(list);
        document.getElementById('btn-create-tournament')?.addEventListener('click', openCreateTournamentModal);
    }

    // ─── 내 정보 뷰 ────────────────────────────────────────
    function renderProfile() {
        appContent.innerHTML = `
            <div class="space-y-4">
                <!-- 프로필 헤더 카드 -->
                <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                    <div class="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-500/25 mb-3 ring-4 ring-blue-50">
                        ${currentUser.nickname ? currentUser.nickname[0] : 'P'}
                    </div>
                    <h2 class="text-xl font-black text-slate-800">${currentUser.nickname}</h2>
                    <div class="flex items-center gap-2 mt-1.5">
                        <span class="bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-0.5 rounded-full text-xs font-bold">
                            ${currentUser.division}
                        </span>
                        <span class="text-xs text-slate-400 font-medium">@${currentUser.id}</span>
                    </div>
                </div>

                <!-- 프로필 수정 카드 -->
                <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                    <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <i class="fa-solid fa-user-pen text-blue-600 text-sm"></i>
                        <h3 class="text-sm font-black text-slate-800">회원 정보 수정</h3>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1.5">닉네임</label>
                            <input type="text" id="prof-nickname" value="${currentUser.nickname}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1.5">지역 부수</label>
                            <div class="relative">
                                <select id="prof-division" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50 appearance-none">
                                    ${DIVISIONS.map(d => `<option value="${d}" ${currentUser.division === d ? 'selected' : ''}>${d}</option>`).join('')}
                                </select>
                                <span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                    <i class="fa-solid fa-chevron-down text-xs"></i>
                                </span>
                            </div>
                        </div>
                        <button id="btn-save-profile" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2">
                            <i class="fa-solid fa-check text-xs"></i>
                            <span>변경사항 저장</span>
                        </button>
                    </div>
                </div>

                <!-- 계정 관리 -->
                <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-2.5">
                    <button id="btn-logout" class="w-full bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                        <span>로그아웃</span>
                    </button>
                    <button id="btn-delete-account" class="w-full text-slate-400 hover:text-rose-500 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                        <i class="fa-regular fa-trash-can text-[11px]"></i>
                        <span>회원탈퇴</span>
                    </button>
                </div>
            </div>`;

        document.getElementById('btn-save-profile').addEventListener('click', async () => {
            const nickname = document.getElementById('prof-nickname').value.trim();
            const division = document.getElementById('prof-division').value;
            if (!nickname) return showToast('닉네임을 입력해주세요.', 'error');
            const { error } = await sb.from('users').update({ nickname, division }).eq('id', currentUser.id);
            if (error) showToast('저장 실패: ' + error.message, 'error');
            else {
                currentUser.nickname = nickname;
                currentUser.division = division;
                showToast('프로필 정보가 저장되었습니다.', 'success');
                renderProfile();
            }
        });

        document.getElementById('btn-logout').addEventListener('click', () => {
            if (confirm('로그아웃 하시겠습니까?')) {
                localStorage.removeItem('loggedInUser');
                currentUser = null;
                showToast('로그아웃 되었습니다.', 'info');
                checkAuth();
            }
        });

        document.getElementById('btn-delete-account').addEventListener('click', async () => {
            if (confirm('정말로 회원탈퇴를 하시겠습니까? 계정 정보는 복구되지 않습니다.')) {
                const { error } = await sb.from('users').delete().eq('id', currentUser.id);
                if (error) {
                    showToast('회원탈퇴 실패: ' + error.message, 'error');
                } else {
                    showToast('회원탈퇴가 완료되었습니다.', 'info');
                    localStorage.removeItem('loggedInUser');
                    currentUser = null;
                    checkAuth();
                }
            }
        });
    }

    // ─── 모달 헬퍼 ─────────────────────────────────────────
    function openModal(html) {
        modalContent.innerHTML = html;
        modalContainer.classList.remove('hidden');
        modalContainer.classList.add('flex');
        requestAnimationFrame(() => modalContent.classList.add('modal-enter'));
        setTimeout(() => modalContent.classList.remove('modal-enter'), 300);
    }

    function closeModal() {
        if (currentChatChannel) {
            sb.removeChannel(currentChatChannel);
            currentChatChannel = null;
        }
        modalContent.classList.add('modal-exit');
        setTimeout(() => {
            modalContainer.classList.add('hidden');
            modalContainer.classList.remove('flex');
            modalContent.classList.remove('modal-exit');
            modalContent.innerHTML = '';
            loadView(currentView);
        }, 220);
    }

    function daumPostcodeOpen(inputId) {
        new daum.Postcode({
            oncomplete(data) {
                const addr = data.roadAddress || data.jibunAddress;
                document.getElementById(inputId).value = data.buildingName ? `${data.buildingName} (${addr})` : addr;
            }
        }).open();
    }

    // ─── 일정 생성 모달 ────────────────────────────────────
    function openCreateScheduleModal() {
        openModal(`
            <!-- 핸들 바 -->
            <div class="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2.5 flex-shrink-0 sm:hidden"></div>
            
            <div class="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                        <i class="fa-solid fa-calendar-plus"></i>
                    </div>
                    <h2 class="text-base font-black text-slate-800">새 모임 일정 등록</h2>
                </div>
                <button id="mc-close" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>
            
            <div class="p-5 overflow-y-auto flex-grow space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">모임 제목</label>
                    <input type="text" id="new-title" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="예) 토요일 오전 탁구 단식/복식">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">날짜</label>
                        <input type="date" id="new-date" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">시간</label>
                        <input type="time" id="new-time" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">탁구장 장소 검색</label>
                    <div class="flex space-x-2">
                        <input type="text" id="new-location" class="flex-grow px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50 cursor-pointer" placeholder="클릭하여 주소 검색" readonly>
                        <button id="btn-loc-search" class="bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 px-4 rounded-xl font-bold transition-all text-sm flex items-center justify-center">
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </button>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">모집 인원 (본인 포함)</label>
                    <div class="flex items-center gap-3">
                        <input type="number" id="new-max" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" min="2" max="30" value="4">
                        <span class="text-xs text-slate-500 font-bold whitespace-nowrap">명</span>
                    </div>
                </div>
            </div>

            <div class="p-4 border-t border-slate-100 bg-white flex-shrink-0">
                <button id="btn-submit-sch" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all">
                    일정 등록 완료
                </button>
            </div>`);

        document.getElementById('mc-close').addEventListener('click', closeModal);
        document.getElementById('btn-loc-search').addEventListener('click', () => daumPostcodeOpen('new-location'));
        document.getElementById('new-location').addEventListener('click', () => daumPostcodeOpen('new-location'));

        // 기본 날짜를 오늘로 설정
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('new-date').value = today;

        document.getElementById('btn-submit-sch').addEventListener('click', async () => {
            const title = document.getElementById('new-title').value.trim();
            const date = document.getElementById('new-date').value;
            const time = document.getElementById('new-time').value;
            const location = document.getElementById('new-location').value;
            const max_participants = parseInt(document.getElementById('new-max').value);

            if (!title || !date || !time || !location) {
                showToast('모든 항목을 입력하고 장소를 선택해주세요.', 'error');
                return;
            }

            const btn = document.getElementById('btn-submit-sch');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 등록 중...';

            const { data: schData, error } = await sb.from('schedules').insert({
                title, date, time, location, max_participants, creator_id: currentUser.id
            }).select().single();

            if (error) {
                showToast('등록 실패: ' + error.message, 'error');
                btn.disabled = false;
                btn.innerHTML = '일정 등록 완료';
                return;
            }

            await sb.from('participants').insert({ schedule_id: schData.id, user_id: currentUser.id });
            showToast('일정이 성공적으로 등록되었습니다!', 'success');
            closeModal();
        });
    }

    // ─── 일정 상세 모달 ────────────────────────────────────
    async function openScheduleDetail(schId) {
        const { data: sch } = await sb.from('schedules').select(`*, participants(user_id, users(nickname, division))`).eq('id', schId).single();
        if (!sch) return;
        sch.participants = (sch.participants || []).map(p => ({
            id: p.user_id,
            nickname: p.users?.nickname || '?',
            division: p.users?.division || ''
        }));

        const isCreator = sch.creator_id === currentUser.id;
        const isParticipant = sch.participants.some(p => p.id === currentUser.id);
        const isFull = sch.participants.length >= sch.max_participants;
        const isCancelled = sch.status === 'cancelled';

        let actionHTML = '';
        if (isCancelled) {
            actionHTML = `<button class="w-full bg-slate-200 text-slate-500 py-3.5 rounded-xl font-bold text-sm cursor-not-allowed" disabled>취소된 일정입니다</button>`;
        } else if (isParticipant) {
            actionHTML = `
                <div class="flex space-x-2">
                    <button id="btn-chat" class="w-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <i class="fa-regular fa-comment-dots text-sm"></i>
                        <span>채팅방</span>
                    </button>
                    <button id="btn-leave" class="w-1/2 bg-rose-50 hover:bg-rose-100 text-rose-600 py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-all">
                        참여 취소
                    </button>
                </div>`;
            if (isCreator) {
                actionHTML += `<button id="btn-cancel-sch" class="w-full mt-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 py-2.5 rounded-xl font-bold text-xs transition-colors">일정 전체 취소하기</button>`;
            }
        } else if (isFull) {
            actionHTML = `<button class="w-full bg-slate-200 text-slate-500 py-3.5 rounded-xl font-bold text-sm cursor-not-allowed" disabled>모집이 마감되었습니다</button>`;
        } else {
            actionHTML = `
                <button id="btn-join" class="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <i class="fa-solid fa-handshake-simple text-sm"></i>
                    <span>지금 참여하기</span>
                </button>`;
        }

        openModal(`
            <!-- 핸들 바 -->
            <div class="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2.5 flex-shrink-0 sm:hidden"></div>

            <div class="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                <div class="flex items-center gap-2 flex-1 min-w-0 pr-3">
                    <span class="w-2 h-2 rounded-full ${isCancelled ? 'bg-rose-500' : isFull ? 'bg-slate-400' : 'bg-emerald-500'} flex-shrink-0"></span>
                    <h2 class="text-base font-black text-slate-800 truncate">${sch.title}</h2>
                </div>
                <button id="mc-close" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors flex-shrink-0">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div class="p-5 overflow-y-auto flex-grow space-y-5">
                <!-- 일정 정보 카드 -->
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <div class="flex items-center text-xs text-slate-700 gap-2">
                        <span class="w-6 h-6 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">
                            <i class="fa-regular fa-calendar"></i>
                        </span>
                        <span class="font-bold text-slate-900">${sch.date}</span>
                        <span class="text-slate-400">|</span>
                        <span class="font-semibold text-slate-700">${sch.time}</span>
                    </div>
                    <div class="flex items-start text-xs text-slate-700 gap-2 pt-1 border-t border-slate-200/50">
                        <span class="w-6 h-6 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                            <i class="fa-solid fa-location-dot"></i>
                        </span>
                        <span class="font-medium text-slate-700 leading-relaxed">${sch.location}</span>
                    </div>
                </div>

                <!-- 참여자 목록 -->
                <div>
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-xs font-black text-slate-800 tracking-tight">참여 멤버</h3>
                        <span class="text-xs font-bold text-blue-600">${sch.participants.length} / ${sch.max_participants}명</span>
                    </div>
                    <div class="space-y-2">
                        ${sch.participants.map((p, idx) => {
                            const colors = ['from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600', 'from-purple-500 to-pink-600', 'from-cyan-500 to-blue-600'];
                            const color = colors[idx % colors.length];
                            const isHost = p.id === sch.creator_id;
                            return `
                                <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white shadow-xs">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-full bg-gradient-to-br ${color} text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                            ${p.nickname[0]}
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-1.5">
                                                <p class="font-bold text-xs text-slate-800">${p.nickname}</p>
                                                ${isHost ? '<span class="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-0.5"><i class="fa-solid fa-crown text-[8px]"></i>방장</span>' : ''}
                                            </div>
                                            <p class="text-[11px] text-slate-400">${p.division || '부수 미입력'}</p>
                                        </div>
                                    </div>
                                    ${p.id === currentUser.id ? '<span class="text-[11px] text-blue-600 font-bold px-2 py-0.5 rounded-full bg-blue-50">나</span>' : ''}
                                </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>

            <div class="p-4 border-t border-slate-100 bg-white flex-shrink-0">${actionHTML}</div>`);

        document.getElementById('mc-close').addEventListener('click', closeModal);

        document.getElementById('btn-join')?.addEventListener('click', async () => {
            const { error } = await sb.from('participants').insert({ schedule_id: schId, user_id: currentUser.id });
            if (error) showToast('참여 실패: ' + error.message, 'error');
            else {
                showToast('모임에 참가했습니다!', 'success');
                openScheduleDetail(schId);
            }
        });

        document.getElementById('btn-leave')?.addEventListener('click', async () => {
            if (confirm('참여를 취소하시겠습니까?')) {
                const { error } = await sb.from('participants').delete().match({ schedule_id: schId, user_id: currentUser.id });
                if (error) showToast('취소 실패: ' + error.message, 'error');
                else {
                    showToast('참여가 취소되었습니다.', 'info');
                    openScheduleDetail(schId);
                }
            }
        });

        document.getElementById('btn-cancel-sch')?.addEventListener('click', async () => {
            if (confirm('이 일정을 취소하시겠습니까? 참여자 모두에게 취소 상태로 표시됩니다.')) {
                const { error } = await sb.from('schedules').update({ status: 'cancelled' }).eq('id', schId);
                if (error) showToast('오류 발생: ' + error.message, 'error');
                else {
                    showToast('일정이 취소되었습니다.', 'info');
                    openScheduleDetail(schId);
                }
            }
        });

        document.getElementById('btn-chat')?.addEventListener('click', () => openChatModal(sch));
    }

    // ─── 채팅 모달 ─────────────────────────────────────────
    async function openChatModal(sch) {
        modalContent.innerHTML = `
            <div class="px-4 py-3.5 border-b border-slate-100 bg-white flex justify-between items-center flex-shrink-0 shadow-xs">
                <button id="chat-back" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors">
                    <i class="fa-solid fa-arrow-left text-sm"></i>
                </button>
                <div class="text-center flex-1 px-2 min-w-0">
                    <h2 class="text-sm font-black text-slate-800 truncate">${sch.title}</h2>
                    <span class="text-[10px] text-slate-400 font-medium">참여자 전용 채팅방</span>
                </div>
                <button id="chat-close" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>
            <div id="chat-messages" class="p-4 overflow-y-auto flex-grow bg-slate-50/70 flex flex-col space-y-3">
                <div class="text-center py-4 text-slate-400 text-xs font-medium">대화를 시작해보세요!</div>
            </div>
            <div class="p-3 border-t border-slate-100 bg-white flex items-center gap-2 flex-shrink-0">
                <input type="text" id="chat-input" class="flex-grow px-4 py-2.5 border border-slate-200 rounded-full text-xs sm:text-sm input-focus-ring bg-slate-50/70" placeholder="메시지를 입력하세요...">
                <button id="btn-send" class="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/25 active:scale-95 transition-all">
                    <i class="fa-solid fa-paper-plane text-xs"></i>
                </button>
            </div>`;

        const chatDiv = document.getElementById('chat-messages');
        let allMsgs = [];

        function renderMsgs() {
            if (!allMsgs.length) {
                chatDiv.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs font-medium">아직 나눈 대화가 없습니다.<br>첫 인사를 건네보세요! 👋</div>';
                return;
            }
            chatDiv.innerHTML = allMsgs.map(msg => {
                const isMe = msg.sender_id === currentUser.id;
                const name = msg.senderName || '?';
                return `
                    <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                        ${!isMe ? `<span class="text-[11px] font-bold text-slate-600 ml-1 mb-1">${name}</span>` : ''}
                        <div class="px-4 py-2.5 text-xs sm:text-sm max-w-[82%] leading-relaxed ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}">
                            ${msg.message}
                        </div>
                        <span class="text-[9px] text-slate-400 mt-1 mx-1">${msg.time || ''}</span>
                    </div>`;
            }).join('');
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }

        const { data: history } = await sb.from('chats').select('*, users(nickname)').eq('schedule_id', sch.id).order('created_at', { ascending: true });
        allMsgs = (history || []).map(m => ({ ...m, senderName: m.users?.nickname || '?' }));
        renderMsgs();

        if (currentChatChannel) sb.removeChannel(currentChatChannel);
        currentChatChannel = sb.channel('chat-' + sch.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats', filter: `schedule_id=eq.${sch.id}` }, async payload => {
                const { data: user } = await sb.from('users').select('nickname').eq('id', payload.new.sender_id).single();
                allMsgs.push({ ...payload.new, senderName: user?.nickname || '?' });
                renderMsgs();
            }).subscribe();

        async function sendMsg() {
            const input = document.getElementById('chat-input');
            const msg = input.value.trim();
            if (!msg) return;
            input.value = '';
            const now = new Date();
            const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            await sb.from('chats').insert({ schedule_id: sch.id, sender_id: currentUser.id, message: msg, time });
        }

        document.getElementById('chat-close').addEventListener('click', closeModal);
        document.getElementById('chat-back').addEventListener('click', () => {
            if (currentChatChannel) {
                sb.removeChannel(currentChatChannel);
                currentChatChannel = null;
            }
            openScheduleDetail(sch.id);
        });
        document.getElementById('btn-send').addEventListener('click', sendMsg);
        document.getElementById('chat-input').addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });
        document.getElementById('chat-input').focus();
    }

    // ─── 대회 생성 모달 ────────────────────────────────────
    function openCreateTournamentModal() {
        openModal(`
            <!-- 핸들 바 -->
            <div class="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2.5 flex-shrink-0 sm:hidden"></div>

            <div class="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center text-xs">
                        <i class="fa-solid fa-bullhorn"></i>
                    </div>
                    <h2 class="text-base font-black text-slate-800">대회 홍보글 작성</h2>
                </div>
                <button id="mc-close" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div class="p-5 overflow-y-auto flex-grow space-y-3.5">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">대회명</label>
                    <input type="text" id="trn-name" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="예) 제1회 핑퐁메이트배 오픈 탁구대회">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">대회 일정</label>
                        <input type="text" id="trn-date" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="예) 2026-10-15">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">접수 기간</label>
                        <input type="text" id="trn-reg-date" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="예) 09-01 ~ 09-30">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">개최 장소 검색</label>
                    <div class="flex space-x-2">
                        <input type="text" id="trn-location" class="flex-grow px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50 cursor-pointer" placeholder="클릭하여 주소 검색" readonly>
                        <button id="btn-trn-loc" class="bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 px-4 rounded-xl font-bold transition-all text-sm flex items-center justify-center">
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">모집 인원</label>
                        <input type="text" id="trn-capacity" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="예) 선착순 128명">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1.5">참가비</label>
                        <input type="text" id="trn-fee" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="예) 2만원">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">참가 자격 / 조건</label>
                    <input type="text" id="trn-condition" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="예) 지역 4부 이하 동호인">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">시상 내역</label>
                    <input type="text" id="trn-reward" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="예) 우승 50만원, 준우승 20만원">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">경기 규칙 및 진행 방식</label>
                    <textarea id="trn-rules" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50 h-20 resize-none" placeholder="예) 조별 예선 리그 후 본선 토너먼트 진행, 5판 3선승제"></textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">상세 링크 (선택)</label>
                    <input type="url" id="trn-link" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm input-focus-ring bg-slate-50/50" placeholder="https://...">
                </div>
            </div>

            <div class="p-4 border-t border-slate-100 bg-white flex-shrink-0">
                <button id="btn-submit-trn" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all">
                    대회 홍보글 등록하기
                </button>
            </div>`);

        document.getElementById('mc-close').addEventListener('click', closeModal);
        document.getElementById('btn-trn-loc').addEventListener('click', () => daumPostcodeOpen('trn-location'));
        document.getElementById('trn-location').addEventListener('click', () => daumPostcodeOpen('trn-location'));

        document.getElementById('btn-submit-trn').addEventListener('click', async () => {
            const name = document.getElementById('trn-name').value.trim();
            const date = document.getElementById('trn-date').value.trim();
            const location = document.getElementById('trn-location').value;

            if (!name || !date || !location) {
                showToast('대회명, 날짜, 장소는 필수 항목입니다.', 'error');
                return;
            }

            const btn = document.getElementById('btn-submit-trn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 등록 중...';

            const { error } = await sb.from('tournaments').insert({
                name, date, location,
                registration_period: document.getElementById('trn-reg-date').value,
                capacity: document.getElementById('trn-capacity').value,
                fee: document.getElementById('trn-fee').value,
                condition: document.getElementById('trn-condition').value,
                reward: document.getElementById('trn-reward').value,
                rules: document.getElementById('trn-rules').value,
                link: document.getElementById('trn-link').value || '#',
                creator_id: currentUser.id
            });

            if (error) {
                showToast('등록 실패: ' + error.message, 'error');
                btn.disabled = false;
                btn.innerHTML = '대회 홍보글 등록하기';
            } else {
                showToast('대회가 등록되었습니다!', 'success');
                closeModal();
            }
        });
    }

    // ─── 대회 상세 모달 ────────────────────────────────────
    async function openTournamentDetail(trnId) {
        const { data: trn } = await sb.from('tournaments').select('*').eq('id', trnId).single();
        if (!trn) return;

        openModal(`
            <!-- 핸들 바 -->
            <div class="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2.5 flex-shrink-0 sm:hidden"></div>

            <div class="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center text-xs">
                        <i class="fa-solid fa-trophy"></i>
                    </span>
                    <h2 class="text-base font-black text-slate-800">대회 상세 요강</h2>
                </div>
                <button id="mc-close" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div class="p-5 overflow-y-auto flex-grow space-y-4">
                <h3 class="font-black text-xl text-slate-900 leading-snug">${trn.name}</h3>

                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                    <div class="flex items-center"><span class="w-20 text-slate-400 font-medium">대회일시</span><span class="font-bold text-slate-900">${trn.date}</span></div>
                    <div class="flex items-center"><span class="w-20 text-slate-400 font-medium">접수기간</span><span class="font-semibold text-slate-700">${trn.registration_period || '상세 요강 참조'}</span></div>
                    <div class="flex items-center"><span class="w-20 text-slate-400 font-medium">개최장소</span><span class="font-semibold text-slate-700 truncate">${trn.location}</span></div>
                </div>

                <div class="space-y-3 text-xs pt-1">
                    <div class="p-3.5 rounded-xl border border-slate-100 bg-white">
                        <span class="text-slate-400 font-bold block mb-1"><i class="fa-solid fa-users mr-1.5 text-blue-500"></i>참가 인원 및 참가 자격</span>
                        <p class="font-medium text-slate-800 leading-relaxed">${trn.capacity || '제한 없음'} / ${trn.condition || '제한 없음'}</p>
                    </div>
                    <div class="p-3.5 rounded-xl border border-slate-100 bg-white">
                        <span class="text-slate-400 font-bold block mb-1"><i class="fa-solid fa-money-bill-wave mr-1.5 text-emerald-500"></i>참가비</span>
                        <p class="font-bold text-emerald-600 text-sm">${trn.fee || '무료'}</p>
                    </div>
                    <div class="p-3.5 rounded-xl border border-slate-100 bg-white">
                        <span class="text-slate-400 font-bold block mb-1"><i class="fa-solid fa-gift mr-1.5 text-amber-500"></i>시상 내역</span>
                        <p class="font-medium text-slate-800 leading-relaxed">${trn.reward || '상세 요강 참조'}</p>
                    </div>
                    <div class="p-3.5 rounded-xl border border-slate-100 bg-white">
                        <span class="text-slate-400 font-bold block mb-1"><i class="fa-solid fa-book-open mr-1.5 text-indigo-500"></i>경기 규칙 및 비고사항</span>
                        <p class="font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">${trn.rules || '상세 요강 참조'}</p>
                    </div>
                </div>

                ${trn.link && trn.link !== '#' ? `
                    <a href="${trn.link}" target="_blank" class="flex items-center justify-center gap-2 w-full text-center border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all mt-3">
                        <span>원문 요강 바로가기</span>
                        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                    </a>` : ''}
            </div>

            ${trn.creator_id === currentUser.id ? `
                <div class="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                    <button id="btn-delete-trn" class="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 py-3 rounded-xl font-bold text-xs transition-colors">
                        홍보글 삭제하기
                    </button>
                </div>` : ''}`);

        document.getElementById('mc-close').addEventListener('click', closeModal);
        document.getElementById('btn-delete-trn')?.addEventListener('click', async () => {
            if (confirm('이 대회 홍보글을 삭제하시겠습니까?')) {
                await sb.from('tournaments').delete().eq('id', trnId);
                showToast('삭제되었습니다.', 'info');
                closeModal();
            }
        });
    }

    // ─── 앱 초기화 ──────────────────────────────────────────
    function init() {
        setupNavigation();
        checkAuth();
    }

    init();
});
