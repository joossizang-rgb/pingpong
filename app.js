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

    // ─── 인증 ──────────────────────────────────────────────
    async function checkAuth() {
        const userId = localStorage.getItem('loggedInUser');
        if (userId) {
            const { data } = await sb.from('users').select('*').eq('id', userId).single();
            if (data) { currentUser = data; showApp(); return; }
            localStorage.removeItem('loggedInUser');
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
            <div class="w-full max-w-sm bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div class="text-center mb-8">
                    <i class="fa-solid fa-table-tennis-paddle-ball text-4xl text-blue-600 mb-2"></i>
                    <h2 class="text-2xl font-bold text-gray-800">핑퐁메이트 로그인</h2>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">아이디</label>
                        <input type="text" id="login-id" class="w-full border border-gray-300 rounded-lg p-3" placeholder="아이디를 입력하세요">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                        <input type="password" id="login-pw" class="w-full border border-gray-300 rounded-lg p-3" placeholder="비밀번호를 입력하세요">
                    </div>
                    <button id="btn-login" class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">로그인</button>
                    <div class="text-center text-sm text-gray-600">
                        계정이 없으신가요? <button id="btn-go-register" class="text-blue-600 font-bold hover:underline">회원가입</button>
                    </div>
                </div>
            </div>`;

        document.getElementById('btn-login').addEventListener('click', async () => {
            const id = document.getElementById('login-id').value.trim();
            const pw = document.getElementById('login-pw').value.trim();
            if (!id || !pw) return alert('아이디와 비밀번호를 입력해주세요.');
            const { data } = await sb.from('users').select('*').eq('id', id).eq('password', pw).single();
            if (data) { localStorage.setItem('loggedInUser', id); currentUser = data; showApp(); }
            else alert('아이디 또는 비밀번호가 올바르지 않습니다.');
        });
        document.getElementById('btn-go-register').addEventListener('click', showRegister);
    }

    function showRegister() {
        authContainer.innerHTML = `
            <div class="w-full max-w-sm bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">회원가입</h2>
                    <p class="text-sm text-gray-500 mt-1">탁구인들의 모임에 합류하세요!</p>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">아이디</label>
                        <input type="text" id="reg-id" class="w-full border border-gray-300 rounded-lg p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                        <input type="password" id="reg-pw" class="w-full border border-gray-300 rounded-lg p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
                        <input type="text" id="reg-nickname" class="w-full border border-gray-300 rounded-lg p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">지역 부수</label>
                        <select id="reg-division" class="w-full border border-gray-300 rounded-lg p-2">
                            ${DIVISIONS.map(d => `<option value="${d}">${d}</option>`).join('')}
                        </select>
                    </div>
                    <button id="btn-register" class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">가입하기</button>
                    <div class="text-center text-sm text-gray-600">
                        <button id="btn-go-login" class="text-blue-600 hover:underline">로그인으로 돌아가기</button>
                    </div>
                </div>
            </div>`;

        document.getElementById('btn-register').addEventListener('click', async () => {
            const id = document.getElementById('reg-id').value.trim();
            const pw = document.getElementById('reg-pw').value.trim();
            const nickname = document.getElementById('reg-nickname').value.trim();
            const division = document.getElementById('reg-division').value;
            if (!id || !pw || !nickname) return alert('모든 필수 항목을 입력해주세요.');
            const { data: existing } = await sb.from('users').select('id').eq('id', id).single();
            if (existing) return alert('이미 존재하는 아이디입니다.');
            const { error } = await sb.from('users').insert({ id, password: pw, nickname, division });
            if (error) alert('회원가입 실패: ' + error.message);
            else { alert('회원가입 완료! 로그인해주세요.'); showLogin(); }
        });
        document.getElementById('btn-go-login').addEventListener('click', showLogin);
    }

    // ─── 네비게이션 ────────────────────────────────────────
    function setupNavigation() {
        navButtons.forEach(btn => {
            btn.addEventListener('click', e => {
                const target = e.currentTarget.dataset.target;
                navButtons.forEach(b => { b.classList.remove('text-blue-600'); b.classList.add('text-gray-400'); });
                e.currentTarget.classList.remove('text-gray-400');
                e.currentTarget.classList.add('text-blue-600');
                loadView(target);
            });
        });
        btnCreateSchedule.addEventListener('click', openCreateScheduleModal);
        modalContainer.addEventListener('click', e => { if (e.target === modalContainer) closeModal(); });
    }

    function showLoading() {
        appContent.innerHTML = '<div class="flex justify-center items-center h-40"><i class="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i></div>';
    }

    async function loadView(viewName) {
        currentView = viewName;
        showLoading();
        if (viewName === 'schedules') {
            btnCreateSchedule.classList.remove('hidden');
            const { data } = await sb.from('schedules').select(`*, participants(user_id, users(nickname, division))`).order('created_at', { ascending: false });
            schedules = (data || []).map(s => ({
                ...s,
                participants: s.participants.map(p => ({ id: p.user_id, nickname: p.users?.nickname || '?', division: p.users?.division || '' }))
            }));
            renderSchedules();
        } else if (viewName === 'tournaments') {
            btnCreateSchedule.classList.add('hidden');
            const { data } = await sb.from('tournaments').select('*').order('created_at', { ascending: false });
            tournaments = data || [];
            renderTournaments();
        } else if (viewName === 'profile') {
            btnCreateSchedule.classList.add('hidden');
            renderProfile();
        }
    }

    // ─── 일정 뷰 ───────────────────────────────────────────
    function renderSchedules() {
        appContent.innerHTML = '';
        if (!schedules.length) {
            appContent.innerHTML = '<div class="text-center mt-10 text-gray-500">등록된 일정이 없습니다.</div>';
            return;
        }
        const list = document.createElement('div');
        list.className = 'space-y-4';
        schedules.forEach(sch => {
            const isFull = sch.participants.length >= sch.max_participants;
            const isCancelled = sch.status === 'cancelled';
            const badge = isCancelled ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">취소됨</span>'
                        : isFull ? '<span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">마감</span>'
                        : '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">모집중</span>';
            const card = document.createElement('div');
            card.className = `bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer${isCancelled ? ' opacity-60' : ''}`;
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-lg">${sch.title}</h3>${badge}
                </div>
                <div class="text-sm text-gray-600 space-y-1">
                    <p><i class="fa-regular fa-calendar mr-2"></i>${sch.date} ${sch.time}</p>
                    <p><i class="fa-solid fa-location-dot mr-2"></i>${sch.location}</p>
                </div>
                <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                    <div class="flex -space-x-2">
                        ${sch.participants.slice(0,5).map(p => `<div class="h-8 w-8 rounded-full ring-2 ring-white bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold" title="${p.nickname}">${p.nickname[0]}</div>`).join('')}
                    </div>
                    <span class="text-sm text-gray-500">${sch.participants.length} / ${sch.max_participants} 명</span>
                </div>`;
            card.addEventListener('click', () => openScheduleDetail(sch.id));
            list.appendChild(card);
        });
        appContent.appendChild(list);
    }

    // ─── 대회 뷰 ───────────────────────────────────────────
    function renderTournaments() {
        appContent.innerHTML = '';
        const topBar = document.createElement('div');
        topBar.className = 'flex justify-between items-center mb-4';
        topBar.innerHTML = `
            <h2 class="text-xl font-bold">탁구 대회 정보</h2>
            <button id="btn-create-tournament" class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                <i class="fa-solid fa-bullhorn mr-1"></i>대회 홍보하기
            </button>`;
        appContent.appendChild(topBar);
        if (!tournaments.length) {
            appContent.innerHTML += '<div class="text-center mt-10 text-gray-500">등록된 대회 홍보글이 없습니다.</div>';
            document.getElementById('btn-create-tournament')?.addEventListener('click', openCreateTournamentModal);
            return;
        }
        const list = document.createElement('div');
        list.className = 'space-y-4';
        tournaments.forEach(trn => {
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50';
            card.innerHTML = `
                <h3 class="font-bold text-lg text-blue-700 mb-2">${trn.name}</h3>
                <div class="text-sm text-gray-600 space-y-1">
                    <p><i class="fa-regular fa-calendar mr-2"></i>대회일: ${trn.date}</p>
                    <p><i class="fa-solid fa-location-dot mr-2"></i>장소: ${trn.location}</p>
                </div>`;
            card.addEventListener('click', () => openTournamentDetail(trn.id));
            list.appendChild(card);
        });
        appContent.appendChild(list);
        document.getElementById('btn-create-tournament').addEventListener('click', openCreateTournamentModal);
    }

    // ─── 내 정보 뷰 ────────────────────────────────────────
    function renderProfile() {
        appContent.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-4">
                <h2 class="text-xl font-bold mb-4">내 정보 설정</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
                        <input type="text" id="prof-nickname" value="${currentUser.nickname}" class="w-full border border-gray-300 rounded-lg p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">지역 부수</label>
                        <select id="prof-division" class="w-full border border-gray-300 rounded-lg p-2">
                            ${DIVISIONS.map(d => `<option value="${d}" ${currentUser.division === d ? 'selected' : ''}>${d}</option>`).join('')}
                        </select>
                    </div>
                    <button id="btn-save-profile" class="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold">저장하기</button>
                    <button id="btn-logout" class="w-full bg-gray-100 text-gray-600 py-2 rounded-lg font-semibold border border-gray-200">로그아웃</button>
                </div>
            </div>`;
        document.getElementById('btn-save-profile').addEventListener('click', async () => {
            const nickname = document.getElementById('prof-nickname').value;
            const division = document.getElementById('prof-division').value;
            const { error } = await sb.from('users').update({ nickname, division }).eq('id', currentUser.id);
            if (error) alert('저장 실패: ' + error.message);
            else { currentUser.nickname = nickname; currentUser.division = division; alert('저장되었습니다.'); }
        });
        document.getElementById('btn-logout').addEventListener('click', () => {
            if (confirm('로그아웃 하시겠습니까?')) {
                localStorage.removeItem('loggedInUser');
                currentUser = null;
                checkAuth();
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
        if (currentChatChannel) { sb.removeChannel(currentChatChannel); currentChatChannel = null; }
        modalContent.classList.add('modal-exit');
        setTimeout(() => {
            modalContainer.classList.add('hidden');
            modalContainer.classList.remove('flex');
            modalContent.classList.remove('modal-exit');
            modalContent.innerHTML = '';
            loadView(currentView);
        }, 300);
    }

    function divisionSelectHTML(selectedValue = '지역 5부') {
        return DIVISIONS.map(d => `<option value="${d}" ${selectedValue === d ? 'selected' : ''}>${d}</option>`).join('');
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
            <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h2 class="text-lg font-bold">새 일정 등록</h2>
                <button id="mc-close" class="p-2 text-gray-500"><i class="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div class="p-4 overflow-y-auto flex-grow space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">제목</label>
                    <input type="text" id="new-title" class="w-full border border-gray-300 rounded-lg p-2" placeholder="예) 토요일 오전 탁구">
                </div>
                <div class="flex space-x-2">
                    <div class="w-1/2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                        <input type="date" id="new-date" class="w-full border border-gray-300 rounded-lg p-2">
                    </div>
                    <div class="w-1/2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">시간</label>
                        <input type="time" id="new-time" class="w-full border border-gray-300 rounded-lg p-2">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">장소 검색</label>
                    <div class="flex space-x-2">
                        <input type="text" id="new-location" class="flex-grow border border-gray-300 rounded-lg p-2 cursor-pointer bg-white" placeholder="클릭하여 주소 검색" readonly>
                        <button id="btn-loc-search" class="bg-blue-100 text-blue-600 px-4 rounded-lg font-bold"><i class="fa-solid fa-magnifying-glass"></i></button>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">모집 인원 (본인 포함)</label>
                    <input type="number" id="new-max" class="w-full border border-gray-300 rounded-lg p-2" min="2" max="30" value="4">
                </div>
            </div>
            <div class="p-4 border-t bg-white">
                <button id="btn-submit-sch" class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">등록하기</button>
            </div>`);

        document.getElementById('mc-close').addEventListener('click', closeModal);
        document.getElementById('btn-loc-search').addEventListener('click', () => daumPostcodeOpen('new-location'));
        document.getElementById('new-location').addEventListener('click', () => daumPostcodeOpen('new-location'));

        document.getElementById('btn-submit-sch').addEventListener('click', async () => {
            const title = document.getElementById('new-title').value.trim();
            const date = document.getElementById('new-date').value;
            const time = document.getElementById('new-time').value;
            const location = document.getElementById('new-location').value;
            const max_participants = parseInt(document.getElementById('new-max').value);
            if (!title || !date || !time || !location) return alert('모든 항목을 입력하고 장소를 선택해주세요.');
            const { data: schData, error } = await sb.from('schedules').insert({ title, date, time, location, max_participants, creator_id: currentUser.id }).select().single();
            if (error) return alert('등록 실패: ' + error.message);
            await sb.from('participants').insert({ schedule_id: schData.id, user_id: currentUser.id });
            closeModal();
        });
    }

    // ─── 일정 상세 모달 ────────────────────────────────────
    async function openScheduleDetail(schId) {
        const { data: sch } = await sb.from('schedules').select(`*, participants(user_id, users(nickname, division))`).eq('id', schId).single();
        if (!sch) return;
        sch.participants = sch.participants.map(p => ({ id: p.user_id, nickname: p.users?.nickname || '?', division: p.users?.division || '' }));

        const isCreator = sch.creator_id === currentUser.id;
        const isParticipant = sch.participants.some(p => p.id === currentUser.id);
        const isFull = sch.participants.length >= sch.max_participants;
        const isCancelled = sch.status === 'cancelled';

        let actionHTML = '';
        if (isCancelled) actionHTML = `<button class="w-full bg-gray-300 text-gray-600 py-3 rounded-lg font-bold" disabled>취소된 일정입니다</button>`;
        else if (isParticipant) {
            actionHTML = `<div class="flex space-x-2"><button id="btn-chat" class="w-1/2 bg-blue-600 text-white py-3 rounded-lg font-bold"><i class="fa-regular fa-comment-dots mr-2"></i>채팅방</button><button id="btn-leave" class="w-1/2 bg-red-100 text-red-600 py-3 rounded-lg font-bold">참여 취소</button></div>`;
            if (isCreator) actionHTML += `<button id="btn-cancel-sch" class="w-full mt-2 bg-red-600 text-white py-3 rounded-lg font-bold">일정 취소</button>`;
        } else if (isFull) actionHTML = `<button class="w-full bg-gray-300 text-gray-600 py-3 rounded-lg font-bold" disabled>마감되었습니다</button>`;
        else actionHTML = `<button id="btn-join" class="w-full bg-green-500 text-white py-3 rounded-lg font-bold">참여하기</button>`;

        openModal(`
            <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h2 class="text-lg font-bold truncate pr-4">${sch.title}</h2>
                <button id="mc-close" class="p-2 text-gray-500"><i class="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div class="p-5 overflow-y-auto flex-grow">
                <div class="space-y-3 mb-6">
                    <p class="text-sm text-gray-600"><i class="fa-regular fa-calendar mr-2"></i>${sch.date} ${sch.time}</p>
                    <p class="text-sm text-gray-600"><i class="fa-solid fa-location-dot mr-2"></i>${sch.location}</p>
                </div>
                <h3 class="font-bold border-b pb-2 mb-3">참여자 (${sch.participants.length}/${sch.max_participants})</h3>
                <ul class="space-y-3 mb-6">
                    ${sch.participants.map(p => `
                        <li class="flex items-center">
                            <div class="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3">${p.nickname[0]}</div>
                            <div>
                                <p class="font-medium text-sm">${p.nickname} ${p.id === sch.creator_id ? '<i class="fa-solid fa-crown text-yellow-500 text-xs ml-1"></i>' : ''}</p>
                                <p class="text-xs text-gray-500">${p.division}</p>
                            </div>
                        </li>`).join('')}
                </ul>
            </div>
            <div class="p-4 border-t bg-gray-50">${actionHTML}</div>`);

        document.getElementById('mc-close').addEventListener('click', closeModal);
        document.getElementById('btn-join')?.addEventListener('click', async () => {
            await sb.from('participants').insert({ schedule_id: schId, user_id: currentUser.id });
            openScheduleDetail(schId);
        });
        document.getElementById('btn-leave')?.addEventListener('click', async () => {
            if (confirm('참여를 취소하시겠습니까?')) {
                await sb.from('participants').delete().match({ schedule_id: schId, user_id: currentUser.id });
                openScheduleDetail(schId);
            }
        });
        document.getElementById('btn-cancel-sch')?.addEventListener('click', async () => {
            if (confirm('이 일정을 취소하시겠습니까?')) {
                await sb.from('schedules').update({ status: 'cancelled' }).eq('id', schId);
                openScheduleDetail(schId);
            }
        });
        document.getElementById('btn-chat')?.addEventListener('click', () => openChatModal(sch));
    }

    // ─── 채팅 모달 ─────────────────────────────────────────
    async function openChatModal(sch) {
        modalContent.innerHTML = `
            <div class="p-4 border-b bg-blue-600 text-white flex justify-between items-center">
                <button id="chat-back" class="p-2 -ml-2"><i class="fa-solid fa-arrow-left"></i></button>
                <h2 class="text-base font-bold truncate px-2">${sch.title} 채팅</h2>
                <button id="chat-close" class="p-2 -mr-2"><i class="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div id="chat-messages" class="p-4 overflow-y-auto flex-grow bg-slate-50 flex flex-col space-y-3"></div>
            <div class="p-3 border-t bg-white flex items-center">
                <input type="text" id="chat-input" class="flex-grow border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="메시지 입력...">
                <button id="btn-send" class="ml-2 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>`;

        const chatDiv = document.getElementById('chat-messages');
        let allMsgs = [];

        function renderMsgs() {
            chatDiv.innerHTML = allMsgs.map(msg => {
                const isMe = msg.sender_id === currentUser.id;
                const name = msg.senderName || '?';
                return `<div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                    ${!isMe ? `<span class="text-xs text-gray-500 ml-1 mb-1">${name}</span>` : ''}
                    <div class="px-4 py-2 text-sm max-w-[80%] ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}">${msg.message}</div>
                    <span class="text-[10px] text-gray-400 mt-1 mx-1">${msg.time}</span>
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
            if (currentChatChannel) { sb.removeChannel(currentChatChannel); currentChatChannel = null; }
            openScheduleDetail(sch.id);
        });
        document.getElementById('btn-send').addEventListener('click', sendMsg);
        document.getElementById('chat-input').addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });
    }

    // ─── 대회 생성 모달 ────────────────────────────────────
    function openCreateTournamentModal() {
        openModal(`
            <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h2 class="text-lg font-bold">대회 홍보하기</h2>
                <button id="mc-close" class="p-2 text-gray-500"><i class="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div class="p-4 overflow-y-auto flex-grow space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">대회명</label>
                    <input type="text" id="trn-name" class="w-full border border-gray-300 rounded-lg p-2" placeholder="예) 제1회 핑퐁메이트 탁구대회">
                </div>
                <div class="flex space-x-2">
                    <div class="w-1/2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">대회 날짜</label>
                        <input type="text" id="trn-date" class="w-full border border-gray-300 rounded-lg p-2" placeholder="예) 2026-12-01 ~ 12-02">
                    </div>
                    <div class="w-1/2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">접수 기간</label>
                        <input type="text" id="trn-reg-date" class="w-full border border-gray-300 rounded-lg p-2" placeholder="예) 11-01 ~ 11-15">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">장소 검색</label>
                    <div class="flex space-x-2">
                        <input type="text" id="trn-location" class="flex-grow border border-gray-300 rounded-lg p-2 cursor-pointer bg-white" placeholder="클릭하여 주소 검색" readonly>
                        <button id="btn-trn-loc" class="bg-blue-100 text-blue-600 px-4 rounded-lg font-bold"><i class="fa-solid fa-magnifying-glass"></i></button>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <div class="w-1/2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">참가 인원</label>
                        <input type="text" id="trn-capacity" class="w-full border border-gray-300 rounded-lg p-2" placeholder="예) 100명">
                    </div>
                    <div class="w-1/2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">참가비</label>
                        <input type="text" id="trn-fee" class="w-full border border-gray-300 rounded-lg p-2" placeholder="예) 2만원">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">참가 조건</label>
                    <input type="text" id="trn-condition" class="w-full border border-gray-300 rounded-lg p-2" placeholder="예) 지역 6부 이하">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">시상 / 보상</label>
                    <input type="text" id="trn-reward" class="w-full border border-gray-300 rounded-lg p-2" placeholder="예) 1등 50만원">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">경기 규칙 요약</label>
                    <textarea id="trn-rules" class="w-full border border-gray-300 rounded-lg p-2 h-20" placeholder="예) 3판 2선승제, 11점 선취..."></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">상세 링크 (선택)</label>
                    <input type="url" id="trn-link" class="w-full border border-gray-300 rounded-lg p-2" placeholder="http://...">
                </div>
            </div>
            <div class="p-4 border-t bg-white">
                <button id="btn-submit-trn" class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">대회 홍보 등록</button>
            </div>`);

        document.getElementById('mc-close').addEventListener('click', closeModal);
        document.getElementById('btn-trn-loc').addEventListener('click', () => daumPostcodeOpen('trn-location'));
        document.getElementById('trn-location').addEventListener('click', () => daumPostcodeOpen('trn-location'));

        document.getElementById('btn-submit-trn').addEventListener('click', async () => {
            const name = document.getElementById('trn-name').value.trim();
            const date = document.getElementById('trn-date').value.trim();
            const location = document.getElementById('trn-location').value;
            if (!name || !date || !location) return alert('대회명, 날짜, 장소는 필수입니다.');
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
            if (error) alert('등록 실패: ' + error.message);
            else { alert('대회가 등록되었습니다.'); closeModal(); }
        });
    }

    // ─── 대회 상세 모달 ────────────────────────────────────
    async function openTournamentDetail(trnId) {
        const { data: trn } = await sb.from('tournaments').select('*').eq('id', trnId).single();
        if (!trn) return;

        openModal(`
            <div class="p-4 border-b bg-blue-50 flex justify-between items-center">
                <h2 class="text-lg font-bold text-blue-800">대회 상세 정보</h2>
                <button id="mc-close" class="p-2 text-gray-500"><i class="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div class="p-5 overflow-y-auto flex-grow">
                <h3 class="font-bold text-xl mb-4">${trn.name}</h3>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2 mb-5 text-sm">
                    <div class="flex"><div class="w-20 text-gray-500">대회일</div><div class="font-semibold">${trn.date}</div></div>
                    <div class="flex"><div class="w-20 text-gray-500">접수기간</div><div>${trn.registration_period || '미정'}</div></div>
                    <div class="flex"><div class="w-20 text-gray-500">장소</div><div>${trn.location}</div></div>
                </div>
                <div class="space-y-4 text-sm mb-5">
                    <div class="border-b pb-2"><span class="text-gray-500 font-medium block mb-1"><i class="fa-solid fa-users mr-1"></i>참가 인원 / 조건</span><p>${trn.capacity || '제한 없음'} / ${trn.condition || '제한 없음'}</p></div>
                    <div class="border-b pb-2"><span class="text-gray-500 font-medium block mb-1"><i class="fa-solid fa-money-bill-wave mr-1"></i>참가비</span><p>${trn.fee || '무료'}</p></div>
                    <div class="border-b pb-2"><span class="text-gray-500 font-medium block mb-1"><i class="fa-solid fa-gift mr-1"></i>시상 내역</span><p>${trn.reward || '상세 요강 참조'}</p></div>
                    <div class="border-b pb-2"><span class="text-gray-500 font-medium block mb-1"><i class="fa-solid fa-book mr-1"></i>경기 규칙</span><p class="whitespace-pre-wrap">${trn.rules || '상세 요강 참조'}</p></div>
                </div>
                ${trn.link && trn.link !== '#' ? `<a href="${trn.link}" target="_blank" class="block w-full text-center border border-blue-600 text-blue-600 py-3 rounded-lg font-bold hover:bg-blue-50">원문 요강 보러가기 <i class="fa-solid fa-external-link-alt ml-1"></i></a>` : ''}
            </div>
            ${trn.creator_id === currentUser.id ? `<div class="p-4 border-t bg-gray-50"><button id="btn-delete-trn" class="w-full bg-red-100 text-red-600 py-3 rounded-lg font-bold">홍보글 삭제하기</button></div>` : ''}`);

        document.getElementById('mc-close').addEventListener('click', closeModal);
        document.getElementById('btn-delete-trn')?.addEventListener('click', async () => {
            if (confirm('이 홍보글을 삭제하시겠습니까?')) {
                await sb.from('tournaments').delete().eq('id', trnId);
                alert('삭제되었습니다.');
                closeModal();
            }
        });
    }

    // ─── 시작 ──────────────────────────────────────────────
    function init() {
        setupNavigation();
        checkAuth();
    }

    init();
});
