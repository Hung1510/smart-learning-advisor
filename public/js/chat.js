document.addEventListener('DOMContentLoaded', () => {
    const chatCard = document.querySelector('.chat-card');
    const chatMain = document.getElementById('chatMain');

    // Xóa inline style để CSS media query hoàn toàn kiểm soát
    if (chatMain) chatMain.style.transform = '';

    window.addEventListener('resize', () => {
        if (!chatMain) return;
        if (window.innerWidth > 767) {
            chatCard.classList.remove('mobile-chat-open');
        }
    });

    document.getElementById('backBtn')?.addEventListener('click', () => {
        chatCard.classList.remove('mobile-chat-open');
    });

    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js').then(({ initializeApp }) => {
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js').then(({
            getDatabase, ref, push, query, orderByChild, onChildAdded, off
        }) => {

            const chatContainer = document.getElementById('chatContainer');
            const chatBox       = document.getElementById('chatBox');
            const messageInput  = document.getElementById('messageInput');
            const sendBtn       = document.getElementById('sendBtn');
            const userList      = document.getElementById('userList');
            const chatWith      = document.getElementById('chatWith');
            const debugStatus   = document.getElementById('debugStatus');
            const searchInput   = document.getElementById('searchInput');
            const topbarOnline  = document.getElementById('topbarOnline');
            const topbarAvatar  = document.getElementById('topbarAvatar');

            if (!chatContainer || !chatBox || !messageInput || !sendBtn) {
                console.error('Critical DOM elements missing');
                if (debugStatus) debugStatus.textContent = 'Lỗi: Thiếu phần tử chính.';
                return;
            }

            const firebaseConfig = {
                apiKey: "AIzaSyD-tQT61oMqgQx40zKe_ayrS-RCACGa2rs",
                authDomain: "smartadvisor-c69be.firebaseapp.com",
                databaseURL: "https://smartadvisor-c69be-default-rtdb.firebaseio.com",
                projectId: "smartadvisor-c69be",
                storageBucket: "smartadvisor-c69be.appspot.com",
                messagingSenderId: "569697301235",
                appId: "1:569697301235:web:e66a7030881c54da4b7d86"
            };

            const app = initializeApp(firebaseConfig);
            const db  = getDatabase(app);
            if (debugStatus) debugStatus.textContent = 'Firebase kết nối thành công';

            function sanitizeId(id = '') {
                return id.replace(/[.#$[\]]/g, '_');
            }

            let currentUser;
            try {
                const userDataStr = chatContainer.getAttribute('data-student');
                currentUser = JSON.parse(userDataStr);
                currentUser.id = sanitizeId(currentUser.id);
                if (debugStatus) debugStatus.textContent = `Đã đăng nhập: ${currentUser.name}`;
            } catch (e) {
                console.error('Invalid user data', e);
                if (debugStatus) debugStatus.textContent = 'Lỗi: Dữ liệu người dùng không hợp lệ';
                return;
            }

            let recipient       = null;
            let activeChatQuery = null;

            const PALETTE = ['#2563eb','#7c3aed','#db2777','#059669','#d97706','#0891b2'];

            function getInitials(name = '') {
                const parts = name.trim().split(/\s+/);
                return (parts.length >= 2
                    ? parts[0][0] + parts[parts.length - 1][0]
                    : name.slice(0, 2)
                ).toUpperCase();
            }

            function getColor(name = '') {
                let h = 0;
                for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
                return PALETTE[Math.abs(h) % PALETTE.length];
            }

            function addMessageToChat(userId, name, message, timestamp) {
                const emptyState = chatBox.querySelector('.chat-empty-state');
                if (emptyState) emptyState.remove();
                if (debugStatus && debugStatus.parentNode === chatBox) debugStatus.remove();

                const isOwn = userId === currentUser.id;
                const time  = new Date(timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit', minute: '2-digit'
                });

                const row = document.createElement('div');
                row.className = 'msg-row' + (isOwn ? ' me' : '');

                const avatarEl = document.createElement('div');
                avatarEl.className = 'msg-avatar';
                avatarEl.style.background = getColor(name);
                avatarEl.textContent = getInitials(name);
                if (isOwn) avatarEl.style.display = 'none';

                const col = document.createElement('div');
                col.className = 'msg-col';

                const bubble = document.createElement('div');
                bubble.className = 'bubble ' + (isOwn ? 'me' : 'them');
                bubble.textContent = message;

                const meta = document.createElement('div');
                meta.className = 'msg-meta';
                meta.textContent = (isOwn ? '' : name + ' · ') + time;

                col.appendChild(bubble);
                col.appendChild(meta);

                if (!isOwn) row.appendChild(avatarEl);
                row.appendChild(col);
                if (isOwn) row.appendChild(avatarEl);

                chatBox.appendChild(row);
                chatBox.scrollTop = chatBox.scrollHeight;
            }

            function loadChat(recipientId, recipientName) {
                if (activeChatQuery) {
                    off(activeChatQuery);
                    activeChatQuery = null;
                }

                chatBox.innerHTML = '';
                chatWith.textContent = recipientName;

                if (topbarAvatar) {
                    topbarAvatar.textContent      = getInitials(recipientName);
                    topbarAvatar.style.background = getColor(recipientName);
                    topbarAvatar.style.display    = 'flex';
                }

                if (topbarOnline) {
                    topbarOnline.innerHTML =
                        '<span style="width:6px;height:6px;border-radius:50%;background:#22c55e;display:inline-block;"></span> Đang hoạt động';
                    topbarOnline.style.display = 'flex';
                }

                const conversationId = [sanitizeId(currentUser.id), sanitizeId(recipientId)].sort().join('_');

                activeChatQuery = query(
                    ref(db, `chats/${conversationId}/messages`),
                    orderByChild('timestamp')
                );

                onChildAdded(activeChatQuery, (snapshot) => {
                    const data = snapshot.val();
                    if (data) addMessageToChat(data.userId, data.name, data.message, data.timestamp);
                });
            }

            function sendMessage() {
                const msg = messageInput.value.trim();
                if (!msg || !recipient) return;

                const conversationId = [sanitizeId(currentUser.id), sanitizeId(recipient.id)].sort().join('_');

                push(ref(db, `chats/${conversationId}/messages`), {
                    userId:    currentUser.id,
                    name:      currentUser.name,
                    message:   msg,
                    timestamp: Date.now()
                });

                messageInput.value = '';
                messageInput.focus();
            }

            sendBtn.addEventListener('click', sendMessage);
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });

            userList?.addEventListener('click', (e) => {
                const li = e.target.closest('[data-user-id]');
                if (!li) return;

                [...userList.querySelectorAll('[data-user-id]')].forEach(el =>
                    el.classList.remove('active')
                );
                li.classList.add('active');

                recipient = { id: li.dataset.userId, name: li.dataset.userName };

                if (window.innerWidth <= 767) {
                    chatCard.classList.add('mobile-chat-open');
                }

                loadChat(recipient.id, recipient.name);
            });

            searchInput?.addEventListener('input', () => {
                const term = searchInput.value.trim().toLowerCase();
                [...userList.querySelectorAll('[data-user-id]')].forEach(li => {
                    const name = (li.dataset.userName || '').toLowerCase();
                    li.style.display = name.includes(term) ? '' : 'none';
                });
            });

            const addUserBtn = document.getElementById('addUserBtn');
            if (addUserBtn && userList) {
                addUserBtn.addEventListener('click', () => {
                    const num      = Math.floor(Math.random() * 900 + 100);
                    const demoId   = 'demo_' + num;
                    const demoName = 'Demo User #' + num;

                    const li = document.createElement('li');
                    li.className = 'contact-item';
                    li.setAttribute('data-user-id',   demoId);
                    li.setAttribute('data-user-name', demoName);
                    li.innerHTML = `
                        <div class="c-avatar" style="background:${getColor(demoName)}">
                            ${getInitials(demoName)}
                            <span class="c-online"></span>
                        </div>
                        <div class="contact-meta">
                            <div class="contact-name">${demoName}</div>
                            <div class="contact-sub">Nhấn để trò chuyện</div>
                        </div>
                    `;
                    userList.appendChild(li);
                    li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
            }

            chatContainer.classList.remove('hidden');
            messageInput.focus();
        });
    });
});