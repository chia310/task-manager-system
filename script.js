


const firebaseConfig = {
    apiKey: "AIzaSyAfzBvIrKK_MX915TF3Ul221o7sFU__gDI",
    authDomain: "task-manager-system-e4f39.firebaseapp.com",
    projectId: "task-manager-system-e4f39",
    storageBucket: "task-manager-system-e4f39.firebasestorage.app",
    messagingSenderId: "271379211595",
    appId: "1:271379211595:web:5a1caffaef5c21986134ce"
  };

  // 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 建立服務的簡易入口 (方便我們之後使用)
const auth = firebase.auth();
const db = firebase.firestore();

let userData = null;
let allUsersList = [];

console.log("Firebase 專案已成功連結！");
console.log("Auth 服務已載入:", auth);
console.log("Firestore 服務已載入:", db);

// --- 6. (更新版 + 小紅點) 讀取與顯示任務 ---
function displayTasks(tasks) {
    // 1. 抓取三個欄位的容器
    const unassignedContainer = document.querySelector('#unassigned-tasks .column-content');
    const uncompletedContainer = document.querySelector('#uncompleted-tasks .column-content');
    const otherContainer = document.querySelector('#other-tasks .column-content');

    // 2. 清空所有欄位的舊內容
    if (!unassignedContainer || !uncompletedContainer || !otherContainer) {
        console.error("無法找到所有任務欄位容器！");
        return;
    }
    unassignedContainer.innerHTML = ''; 
    uncompletedContainer.innerHTML = ''; 
    otherContainer.innerHTML = ''; 

    const currentUser = auth.currentUser; 

    // 3. 將任務分類放入對應容器
    tasks.forEach(task => { // (★ 保持你原本的 forEach(task => ...))
        const taskData = task.data(); 
        const taskId = task.id; 

        // --- (建立 taskElement 的程式碼與之前完全相同) ---
        const taskElement = document.createElement('div');
        taskElement.classList.add('task-item'); 
        taskElement.setAttribute('data-id', taskId); 

        // (你原本的 classList.add 邏輯... 保持不變)
        if (taskData.status === '未完成') {
            taskElement.classList.add('status-uncompleted'); 
        }
        if (!taskData.assignedToUid) { 
            taskElement.classList.add('assignment-unassigned'); 
        }
        // --- (以上建立 taskElement 不變) ---

        // (你原本的權限判斷... 保持不變)
        const assignedToText = taskData.assignedToDisplay || "未指派"; 
        const isCreator = currentUser && currentUser.uid === taskData.createdById;
        const isAdmin = userData && userData.role === 'Admin';
        const isAssigned = currentUser && currentUser.uid === taskData.assignedToUid;
        const canDelete = (isAdmin || isCreator);
        const canUpdateStatus = (isAdmin || isCreator || isAssigned);

        // (你原本的 assignedToHTML 邏輯... 保持不變)
        let assignedToHTML = '';
        if (isAdmin) { 
            let optionsHTML = '<option value="">-- 暫不指派 --</option>';
            let leadsGroup = '<optgroup label="教學組長">';
            let salesGroup = '<optgroup label="業務同仁">';
            let adminGroup = '<optgroup label="管理員">';
            allUsersList.forEach(user => { const selected = (user.uid === taskData.assignedToUid) ? 'selected' : ''; const option = `<option value="${user.uid}" ${selected}>${user.displayName || user.email}</option>`; if (user.role === '教學組長') leadsGroup += option; else if (user.role === '業務') salesGroup += option; else if (user.role === 'Admin') adminGroup += option; });
            leadsGroup += '</optgroup>'; salesGroup += '</optgroup>'; adminGroup += '</optgroup>';
            optionsHTML += adminGroup + leadsGroup + salesGroup;
            assignedToHTML = `<p class="task-meta"><strong>指派給：</strong><select class="assign-task-select" data-task-id="${taskId}">${optionsHTML}</select></p>`;
        } else {
             assignedToHTML = `<p class="task-meta"><strong>指派給：</strong><span>${assignedToText}</span></p>`; 
        }

        // ▼▼▼ ★★★ 請在這裡「加入」新的邏輯 ★★★ ▼▼▼
        
        // --- 檢查「新留言」通知 ---
        let notificationHTML = ''; // 預設為空
        const viewedBy = taskData.viewedBy || []; // 取得看過的人 (如果不存在，給一個空陣列)
        const lastCommentBy = taskData.lastCommentBy || ''; // 取得最後留言者

        // 判斷邏輯：
        // 1. 必須要有留言 (lastCommentBy 不是空的)
        // 2. 目前使用者「不在」看過的陣列中
        // 3. 目前使用者「不是」最後那個留言的人 (避免自己幫自己亮燈)
        if (currentUser && // (多加一個 currentUser 的防呆檢查)
            lastCommentBy && 
            !viewedBy.includes(currentUser.uid) &&
            lastCommentBy !== currentUser.email) {
            
            // 如果都符合，就設定小紅點的 HTML
            notificationHTML = '<span class="notification-dot"></span>';
        }
        // ▲▲▲ ★★★ 加入結束 ★★★ ▲▲▲

        // (★ 修改：在「留言」按鈕中，插入 notificationHTML 變數)
        taskElement.innerHTML = `
            <h3>${taskData.name}</h3>
            <p class="task-description">${taskData.description}</p> 
            ${assignedToHTML} 
            <p class="task-meta"><small>建立者：</small><span>${taskData.createdByEmail}</span></p> 
            <div class="task-actions">
                <label for="status-select-${taskId}"><strong>狀態：</strong></label>
                <select class="status-select" data-id="${taskId}" ${!canUpdateStatus ? 'disabled' : ''}>
                    <option value="未完成" ${taskData.status === '未完成' ? 'selected' : ''}>未完成</option>
                    <option value="進行中" ${taskData.status === '進行中' ? 'selected' : ''}>進行中</option>
                    <option value="已完成" ${taskData.status === '已完成' ? 'selected' : ''}>已完成</option>
                </select>
                
                <button class="comments-btn" data-id="${taskId}" data-name="${taskData.name}">
                    留言 ${notificationHTML}
                </button>
                                ${canDelete ? `<button class="delete-task-btn" data-id="${taskId}">刪除任務</button>` : ''}
            </div>
        `;

        // ★★★ 核心邏輯：判斷任務該放入哪一欄 ★★★
        // (你原本的 appendChild 邏輯... 保持不變)
        if (!taskData.assignedToUid) {
            unassignedContainer.appendChild(taskElement); // 未指派 (紅色)
        } else if (taskData.status === '未完成') {
            uncompletedContainer.appendChild(taskElement); // 未完成 (黃色)
        } else {
            otherContainer.appendChild(taskElement); // 其他 (白色)
        }
    });

    // 4. 如果某欄沒有任務，顯示提示文字
    // (你原本的 if 判斷... 保持不變)
    if (unassignedContainer.innerHTML === '') {
        unassignedContainer.innerHTML = '<p>目前沒有未指派的任務。</p>';
    }
    if (uncompletedContainer.innerHTML === '') {
        uncompletedContainer.innerHTML = '<p>目前沒有待辦的任務。</p>';
    }
    if (otherContainer.innerHTML === '') {
        otherContainer.innerHTML = '<p>目前沒有進行中或已完成的任務。</p>';
    }
}




// --- 7. 載入使用者名單到下拉選單 (★★★ 升級版，含快取 ★★★) ---
async function loadUsersDropdown(selectElementId, isFilterDropdown = false) {
    // (此函式現在會快取 allUsersList)
    const selectElement = document.getElementById(selectElementId);
    if (!selectElement) return; // 防呆

    // 1. 清空舊選項
    selectElement.innerHTML = ''; 

    // 2. 根據用途，新增「預設」選項
    if (isFilterDropdown) {
        // 這是給 Admin 篩選器用的
        selectElement.add(new Option('-- 所有使用者 --', 'all-tasks'));
        selectElement.add(new Option('-- 未指派 --', 'unassigned'));
    } else {
        // 這是給「建立任務」表單用的
        selectElement.add(new Option('-- 暫不指派 --', ''));
    }

    try {
        // 3. 檢查快取，如果為空才去讀取 DB
        if (allUsersList.length === 0) {
            console.log("正在從 Firestore 讀取使用者名單...");
            const snapshot = await db.collection("users").orderBy("email").get();
            allUsersList = snapshot.docs.map(doc => doc.data());
        }

        // 4. 將 allUsersList 填入選單
        allUsersList.forEach(user => {
            const displayName = user.displayName || user.email;
            selectElement.add(new Option(displayName, user.uid));
        });

    } catch (error) {
        console.error("載入使用者下拉選單失敗:", error);
    }
}


// --- 9. 更新使用者角色 (Admin) ---
async function updateUserRole(uid, newRole) {
    try {
        await db.collection("users").doc(uid).update({
            role: newRole
        });
        alert('角色更新成功！');
        await loadUsersDropdown(); // 更新任務指派的下拉選單
    } catch (error) {
        console.error("更新角色失敗:", error);
        alert('更新角色失敗！');
    }
}

// --- 10. 刪除使用者 (Admin) ---
async function deleteUser(uid, userEmail) {
    // 警告：這只會從 Firestore (我們的名單) 中刪除，不會刪除 Auth (登入帳號)
    // 對於內部系統，這通常足夠了，因為他們將無法被指派任務或管理。
    if (confirm(`確定要將 ${userEmail} 從使用者名單中刪除嗎？\n(注意：這只會將他們從名單移除，不會刪除他們的登入帳號)`)) {
        try {
            await db.collection("users").doc(uid).delete();
            alert('使用者已從名單中刪除！');
            await loadUserManagementTable(); // 重新載入管理列表
            await loadUsersDropdown(); // 更新任務指派的下拉選單
        } catch (error) {
            console.error("刪除使用者失敗:", error);
            alert('刪除使用者失敗！');
        }
    }
}


// --- 12. 更新任務狀態 (Update) ---
async function updateTaskStatus(taskId, newStatus) {
    try {
        // ★ 建立一個物件來存放要更新的資料
        let updateData = {
            status: newStatus
        };

        // ★ 關鍵邏輯：
        // 如果新狀態是「已完成」，我們就「新增」一個 'completedAt' 時間戳
        // 如果狀態「不是」已完成 (例如改回 "進行中")，我們就「移除」'completedAt'
        if (newStatus === '已完成') {
            updateData.completedAt = firebase.firestore.FieldValue.serverTimestamp();
        } else {
            updateData.completedAt = null; // 或使用 firebase.firestore.FieldValue.delete()
        }

        // (★ 修改：從只更新 status，改為更新 updateData 物件)
        await db.collection("tasks").doc(taskId).update(updateData);
        
        console.log(`任務 ${taskId} 狀態已更新為 ${newStatus}`);

        // (你原本的「日誌」程式碼，保持不變)
        if (newStatus === '已完成') {
            await logActivity('task_completed', taskId, { 
                newStatus: newStatus 
            });
        }

    } catch (error) {
        console.error("更新任務狀態失敗:", error);
        alert('更新狀態失敗！');
    }
}

// --- (全新) 20. 記錄活動日誌 輔助函式 ---
async function logActivity(action, taskId, details = {}) {
    // 取得目前登入的使用者
    const user = auth.currentUser;
    if (!user) {
        console.error("無法記錄日誌：使用者未登入");
        return; 
    }

    try {
        // 在 "activityLogs" 集合中新增一筆文件
        await db.collection("activityLogs").add({
            action: action,         // 執行的動作 (例如 'task_deleted')
            taskId: taskId,         // 關聯的任務 ID
            userId: user.uid,       // 執行動作的使用者 ID
            userEmail: user.email,  // 執行動作的使用者 Email
            timestamp: firebase.firestore.FieldValue.serverTimestamp(), // 動作時間
            details: details        // 其他細節 (例如 { taskName: '...' } )
        });
        console.log('活動日誌已記錄:', action);
    } catch (error) {
        console.error("記錄日誌時發生錯誤:", error);
    }
}

// --- 13. 刪除任務 (Delete) ---
async function deleteTask(taskId, taskName) {
    if (confirm(`確定要刪除任務 "${taskName}" 嗎？\n這個動作無法復原！`)) {
        try {
            await logActivity('task_deleted', taskId, { 
                taskName: taskName 
            });

            await db.collection("tasks").doc(taskId).delete();
            console.log(`任務 ${taskId} 已被刪除`);
            // onSnapshot 監聽器會自動偵測到刪除，並更新畫面

            if (userData.role === 'Admin') loadStatsDashboard();
        } catch (error) {
            console.error("刪除任務失敗:", error);
            alert('刪除任務失敗！');
        }
    }
}


// --- ★★★ 頁面載入完成後才執行的程式碼 ★★★ ---
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM 已完全載入，開始綁定事件...");

    // --- 抓取新加入的 HTML 元素 ---
    let tasksListener = null; 
    const createTaskForm = document.getElementById('create-task-form');
    const taskNameInput = document.getElementById('summary');
    const taskDescInput = document.getElementById('task-desc');
    const taskListContainer = document.getElementById('task-list-columns-container');
    const adminPanel = document.getElementById('admin-panel');
    const userListBody = document.getElementById('user-list-body');
    const commentsModal = document.getElementById('comments-modal');
    const closeCommentsBtn = document.getElementById('close-comments-btn');
    const commentsTaskName = document.getElementById('comments-task-name');
    const commentsListContainer = document.getElementById('comments-list-container');
    const addCommentForm = document.getElementById('add-comment-form');
    const commentTextInput = document.getElementById('comment-text');
    const statsTableBody = document.getElementById('stats-table-body');
    const authContainer = document.getElementById('auth-container');
    const taskDashboard = document.getElementById('task-dashboard');
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const registerButton = document.getElementById('register-button');
    const logoutButton = document.getElementById('logout-button');
    const userEmailDisplay = document.getElementById('user-email');
    const googleLoginButton = document.getElementById('google-login-button');
    const adminFilterContainer = document.getElementById('admin-filter-container');
    const adminFilterStatus = document.getElementById('admin-filter-status');
    const adminFilterUser = document.getElementById('admin-filter-user');
    const statsSummaryContainer = document.getElementById('stats-summary-container');
    const statsWeekCreated = document.getElementById('stats-week-created');
    const statsWeekCompleted = document.getElementById('stats-week-completed');

    // 監聽「狀態」篩選器
    adminFilterStatus.addEventListener('change', () => {
        console.log("狀態篩選器變更，觸發列表與儀表板更新...");
        listenForAdminTasks();  // 1. 更新下面的任務列表
        loadStatsDashboard(); // 2. ★ 新增：同時更新上面的儀表板
    });

    // 監聽「使用者」篩選器
    adminFilterUser.addEventListener('change', () => {
        console.log("使用者篩選器變更，觸發列表與儀表板更新...");
        listenForAdminTasks();  // 1. 更新下面的任務列表
        loadStatsDashboard(); // 2. ★ 新增：同時更新上面的儀表板
    });

// --- 2. 登入功能 (★ 修正為 Google 登入) ---
// (記得要先在最上方抓取 googleLoginButton 變數)
googleLoginButton.addEventListener('click', () => {
    
    // 1. 建立一個 Google Auth Provider 的實例
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // 2. ★ 關鍵步驟：設定要限定的 Google Workspace 網域
    // 'hd' 代表 "Hosted Domain"
    googleProvider.setCustomParameters({
        'hd': 'orangeapple.co'
    });

    // 3. 使用 "signInWithPopup" 彈窗方式來登入
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            
            // 4. 從登入結果(result)中取得使用者資訊
            const user = result.user;
            const uid = user.uid;
            
            // 5. 檢查這是不是「第一次」登入
            const userDocRef = db.collection('users').doc(uid);

            userDocRef.get().then((doc) => {
                if (!doc.exists) {
                    // --- 6A. 這是一個新使用者 ---
                    console.log('新使用者，正在建立 Firestore 資料...');
                    
                    // 我們立刻為他建立一份使用者資料
                    // ★ 關鍵：我們直接使用 user.displayName 來抓取他的 Google 姓名
                    userDocRef.set({
                        uid: uid,
                        email: user.email,
                        displayName: user.displayName, // <-- 自動從 Google 抓取的姓名
                        role: "業務" // 預設新註冊的使用者為 "業務"
                    })
                    .then(() => {
                        console.log('新使用者資料已建立！');
                        // 接下來 auth.onAuthStateChanged 會自動接管登入流程
                    });

                } else {
                    // --- 6B. 這是一個老使用者 ---
                    console.log('歡迎回來！', user.displayName);
                    // 不需要做任何事，auth.onAuthStateChanged 會自動處理登入
                }
            });

        })
        .catch((error) => {
            // 處理登入失敗
            console.error('Google 登入失敗:', error);
            if (error.code === 'auth/operation-not-allowed') {
                alert('登入失敗：您選擇的 Google 帳號不是 @orangeapple.co 網域。');
            } else if (error.code !== 'auth/cancelled-popup-request') {
                // 如果不是使用者自己關閉彈窗，就顯示錯誤
                alert('登入失敗：' + error.message);
            }
        });
});
    
   // --- 3. 登出功能 ---
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            console.log('已成功登出');
        }).catch((error) => {
            console.error('登出時發生錯誤:', error);
        });
    });


// --- 4. 登入狀態監聽 (★★★ 最終修正版 ★★★) ---
auth.onAuthStateChanged(async (user) => { 
    
    if (user) {
        // --- 使用者已登入 ---
        // let userData = null; // <--- ★ 我已經將這一行「刪除」了 ★
        
        try {
            const userDoc = await db.collection("users").doc(user.uid).get();
            if (userDoc.exists) {
                // 現在，這行會正確地賦值給「全域」的 userData 變數
                userData = userDoc.data(); 
                console.log('使用者角色:', userData.role);
            } else {
                alert('找不到您的使用者資料，請聯繫管理員！');
                auth.signOut(); 
                return;
            }
        } catch (error) {
            console.error("獲取使用者資料失敗:", error);
            auth.signOut(); 
            return;
        }

        // --- 顯示主儀表板 ---
        console.log('使用者已登入:', user.email);
        taskDashboard.style.display = 'block';
        authContainer.style.display = 'none';
        userEmailDisplay.textContent = userData.displayName || user.email; 

        if (userData.role === 'Admin') {
            console.log('偵測到管理員登入，顯示管理面板');
            adminPanel.style.display = 'block'; 
            adminFilterContainer.style.display = 'block';
            loadUserManagementTable(); 
            loadStatsDashboard();
            await loadUsersDropdown('admin-filter-user', true);
        } else {
            adminPanel.style.display = 'none'; 
            adminFilterContainer.style.display = 'none';
        }

        // 必須「等待」使用者名單載入完成 (填滿 allUsersList 快取)
        await loadUsersDropdown('assign-to-user'); 

        // 現在 allUsersList 已經有資料了，再開始監聽任務
        if (userData.role === 'Admin') {
            // --- Admin 登入邏輯 ---
            // (Admin 的 query 和 listener 由 listenForAdminTasks 內部處理)
            console.log("查詢模式：管理員 (啟動篩選器)");
            listenForAdminTasks(); 

        } else {
            // --- 一般使用者登入邏輯 ---
            // (★ 關鍵：'query' 和 'tasksListener' 都必須「在 else 內部」)
            console.log("查詢模式：一般使用者 (讀取個人及未指派任務)");
            
            // 1. 在 else 內部宣告 query
            let query = db.collection("tasks") 
                .where("assignedToUid", "in", [null, user.uid])
                .orderBy("createdAt", "desc");
            
            // 2. 在 else 內部綁定 listener
            // (tasksListener 變數本身是在 DOMContentLoaded 頂層宣告的)
            tasksListener = query.onSnapshot((snapshot) => {
                console.log("偵測到任務資料變動！");
                const tasks = snapshot.docs; 
                displayTasks(tasks); 
            }, (error) => {
                console.error("讀取任務時發生錯誤:", error);
                if (error.code === 'failed-precondition') {
                    alert("讀取任務失敗！您的查詢需要建立新的資料庫索引。\n\n請「檢查主控台(Console)」中的錯誤訊息，並「點擊」錯誤訊息中的連結來自動建立索引。");
                    console.error("Firestore 索引錯誤！請點擊以下連結建立索引：", error.message);
                } else {
                    alert('讀取任務列表失敗！');
                }
            });
        }

    } else {
        // --- 使用者已登出 ---
        console.log('使用者已登出');
        userData = null; 
        allUsersList = []; 

        taskDashboard.style.display = 'none';
        authContainer.style.display = 'block';
        adminPanel.style.display = 'none'; 
        dminFilterContainer.style.display = 'none';

        if (tasksListener) {
            tasksListener(); 
            console.log("已停止監聽任務列表");
        }
        if (taskListContainer) {
            taskListContainer.innerHTML = '';
        }
    }
});

    // --- 5. 建立新任務 (Create) ---
    createTaskForm.addEventListener('submit', (event) => {
        event.preventDefault(); 

        const taskName = taskNameInput.value;
        const taskDesc = taskDescInput.value;
        const currentUser = auth.currentUser;
        
        // 獲取指派選單的資訊
        const assignSelect = document.getElementById('assign-to-user');
        const assignedToUid = assignSelect.value; // 獲取選中的 UID
        const assignedToEmail = assignedToUid ? assignSelect.options[assignSelect.selectedIndex].text : "未指派"; // 獲取顯示的文字

        if (!taskName || !currentUser) {
            alert('請輸入任務標題！');
            return;
        }

        // 準備要存入資料庫的任務物件
        let taskData = {
            name: taskName,
            description: taskDesc,
            status: "未完成", 
            createdByEmail: currentUser.email, 
            createdById: currentUser.uid, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            // ★ 新增的指派欄位 ★
            assignedToUid: assignedToUid || null, // 如果沒選，就存 null
            assignedToDisplay: assignedToEmail // 儲存被指派者的顯示名稱/Email
        };

        db.collection("tasks").add(taskData)
        .then((docRef) => {
            console.log("任務已成功建立:", docRef.id);
            createTaskForm.reset(); // 清空表單
            assignSelect.value = ""; // 將指派選單重設為 "暫不指派"
            if (userData.role === 'Admin') loadStatsDashboard();
        })
        .catch((error) => {
            console.error("建立任務時發生錯誤:", error);
            alert('建立任務失敗！');
        });
    });

    /**
     * 處理所有任務卡片的「展開/收合」功能
     */
    function initializeTaskExpandButtons() {
        // 1. 找出頁面上「所有」的 .toggle-expand-btn 按鈕
        const allToggleButtons = document.querySelectorAll('.toggle-expand-btn');

        // 2. 為每一個按鈕加上點擊事件
        allToggleButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                // 阻止 <a> 標籤的預設跳轉行為
                event.preventDefault(); 

                // 3. 找到被點擊按鈕的「父層卡片」(.task-item)
                const taskItemCard = this.closest('.task-item');

                if (taskItemCard) {
                    // 4. 切換 .is-expanded 這個 class
                    taskItemCard.classList.toggle('is-expanded');

                    // 5. (選用) 根據狀態更新按鈕文字
                    if (taskItemCard.classList.contains('is-expanded')) {
                        this.textContent = '顯示更少';
                    } else {
                        this.textContent = '顯示更多';
                    }
                }
            });
        });
    }


    // --- 8. 載入使用者到管理面板 (Admin) ---
    async function loadUserManagementTable() {
        if (!userListBody) return; // 確保元素存在
        userListBody.innerHTML = '<tr><td colspan="3">正在載入...</td></tr>';

        const snapshot = await db.collection("users").get();
        userListBody.innerHTML = ''; // 清空載入中

        snapshot.forEach(doc => {
            const user = doc.data();
            
            // 我們不讓 Admin 刪除或修改自己的角色
            const isCurrentUser = auth.currentUser && auth.currentUser.uid === user.uid;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="border: 1px solid #ccc; padding: 5px;">${user.displayName || user.email}</td>
                <td style="border: 1px solid #ccc; padding: 5px;">
                    <select class="role-select" data-uid="${user.uid}" ${isCurrentUser ? 'disabled' : ''}>
                        <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>管理員</option>
                        <option value="教學組長" ${user.role === '教學組長' ? 'selected' : ''}>教學組長</option>
                        <option value="業務" ${user.role === '業務' ? 'selected' : ''}>業務同仁</option>
                    </select>
                </td>
                <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">
                    <button class="delete-user-btn" data-uid="${user.uid}" ${isCurrentUser ? 'disabled' : ''}>刪除</button>
                </td>
            `;
            userListBody.appendChild(row);
        });
    }

    // --- 11. 啟動管理面板的事件監聽 ---
    // 我們使用事件委派，來監聽整個表格的點擊事件
    userListBody.addEventListener('click', (event) => {
        const target = event.target;
        const uid = target.dataset.uid;

        if (target.classList.contains('delete-user-btn') && uid) {
            // 點擊了刪除按鈕
            const userEmail = target.closest('tr').firstElementChild.textContent;
            deleteUser(uid, userEmail);
        }
    });

    userListBody.addEventListener('change', (event) => {
        const target = event.target;
        const uid = target.dataset.uid;

        if (target.classList.contains('role-select') && uid) {
            // 變更了角色下拉選單
            const newRole = target.value;
            updateUserRole(uid, newRole);
        }
    });

    // --- 14. 啟動任務列表的事件監聽 (Update & Delete) ---
    // 我們使用事件委派，來監聽整個列表容器的事件
    taskListContainer.addEventListener('change', (event) => {
        const target = event.target;
        if (target.classList.contains('status-select')) {
            // 使用者變更了狀態下拉選單
            const taskId = target.dataset.id;
            const newStatus = target.value;
            updateTaskStatus(taskId, newStatus);
        }

        if (target.classList.contains('assign-task-select')) {
            const taskId = target.dataset.taskId;
            const newUid = target.value;
            const newDisplayName = newUid ? target.options[target.selectedIndex].text : "未指派";

            // 呼叫我們即將建立的新函式
            updateTaskAssignment(taskId, newUid, newDisplayName);
        }
    });

    taskListContainer.addEventListener('click', (event) => {
        const target = event.target;
        // 監聽留言按鈕
        if (target.classList.contains('comments-btn')) {
            const taskId = target.dataset.id;
            const taskName = target.dataset.name;
            openCommentsModal(taskId, taskName); // 呼叫函式打開彈窗
        }

        if (target.classList.contains('delete-task-btn')) {
            // 使用者點擊了刪除按鈕
            const taskId = target.dataset.id;
            // 找到任務標題，用於確認提示框
            const taskName = target.closest('.task-item').querySelector('h3').textContent;
            deleteTask(taskId, taskName);
        }
        if (target.classList.contains('toggle-expand-btn')) {
                // 1. 阻止 <a> 標籤的預設跳轉行為
                event.preventDefault(); 
                
                // 2. 找到被點擊按鈕的「父層卡片」(.task-item)
                const taskItem = target.closest('.task-item');
                
                if (taskItem) {
                    // 3. 在父層卡片上「切換」 .is-expanded 這個 CSS class
                    taskItem.classList.toggle('is-expanded');
                    
                    // 4. (選用) 根據狀態，改變按鈕上的文字
                    if (taskItem.classList.contains('is-expanded')) {
                        target.textContent = '... 顯示更少 ...';
                    } else {
                        target.textContent = '... 顯示更多 ...';
                    }
                }
            }

    });


    // --- 15. (更新版) 留言功能相關 ---// (你原本的全域變數... 保持不變)

    let currentOpenTaskId = null; 
    let commentsListener = null; 

    // 函式：打開留言彈窗 (★ 已更新為 async 函式 ★)
    async function openCommentsModal(taskId, taskName) {

        // --- 1. (新增) 標記任務為「已讀」 ---
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const taskRef = db.collection("tasks").doc(taskId);
                // 使用 arrayUnion 將目前使用者加入「已看過」陣列
                // (如果已存在，Firestore 會自動忽略，不會重複加入)
                await taskRef.update({
                    viewedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                });
                console.log(`已將 ${currentUser.email} 標記為已讀`);
                // (任務列表的 onSnapshot 會自動偵測到這個變動，並移除小紅點)
            } catch (error) {
                console.error("標記任務已讀時失敗:", error);
                // (這裡失敗沒關係，不影響留言載入)
            }
        }

        // --- 2. (你原本的) 設定彈窗內容 ---
        currentOpenTaskId = taskId; 
        commentsTaskName.textContent = taskName; 
        commentsListContainer.innerHTML = '<p>正在載入留言...</p>';
        commentsModal.style.display = 'flex';

    // --- 3. 停止「舊」的監聽
        if (commentsListener) {
            commentsListener(); // 停止上一個任務的留言監聽
            console.log("已停止舊的留言監聽");
        }

        // --- 4. 啟動「新」的即時監聽器 ---
        commentsListener = db.collection("tasks").doc(taskId).collection("comments")
            .orderBy("createdAt", "asc") 
            .onSnapshot((snapshot) => {
                const comments = snapshot.docs;
                displayComments(comments); // 呼叫函式來顯示留言
            }, (error) => {
                console.error("載入留言失敗:", error);
                commentsListContainer.innerHTML = '<p>載入留言失敗！</p>';
            });
    }


    function closeCommentsModal() {

        if (commentsListener) {
            commentsListener(); 
            commentsListener = null;
            console.log("已停止留言監聽 (彈窗關閉)");
        }
        currentOpenTaskId = null;
        commentsModal.style.display = 'none';
        addCommentForm.reset();
    }

    function displayComments(comments) {
        commentsListContainer.innerHTML = ''; // 清空舊留言
        if (comments.length === 0) {
            commentsListContainer.innerHTML = '<p>目前沒有任何留言。</p>';
            return;
        }

        comments.forEach(commentDoc => {
            const comment = commentDoc.data();
            const date = comment.createdAt ? comment.createdAt.toDate().toLocaleString('zh-TW') : '時間未知';

            const commentElement = document.createElement('div');
            commentElement.classList.add('comment-item');
            commentElement.innerHTML = `
                <p><strong>${comment.createdByEmail || '匿名'}:</strong></p>
                <p>${comment.text}</p>
                <small>${date}</small>
            `;
            commentsListContainer.appendChild(commentElement);
        });

        
        // 讓滾動條自動滾到最下面
        commentsListContainer.scrollTop = commentsListContainer.scrollHeight;
    }


    // --- 16. 監聽彈窗的關閉與提交事件 ---

    // 監聽：關閉按鈕 (X)
    closeCommentsBtn.addEventListener('click', closeCommentsModal);

    // 監聽：點擊彈窗外部的灰色區域也會關閉
    window.addEventListener('click', (event) => {
        if (event.target == commentsModal) {
            closeCommentsModal();
        }
    });

    // 監聽：新增留言表單的「送出」按鈕
    addCommentForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 防止表單提交
         
        const commentText = commentTextInput.value;
        const currentUser = auth.currentUser;

        if (!commentText || !currentUser || !currentOpenTaskId) {
            alert('無法送出留言，請稍後再試。');
            return;
        }

        try {
            // (這是你原本的日誌功能，但它抓不到 docRef，我們先註解掉)
            // await logActivity('comment_added', currentOpenTaskId, { ... });
            
            // --- ★ 這是我們要新增的核心邏G輯 ★ ---

            // 1. 取得任務文件的參照
            const taskRef = db.collection("tasks").doc(currentOpenTaskId);

            // 2. 在 "comments" 子集合中新增一筆留言
            const docRef = await taskRef.collection("comments").add({
                text: commentText,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdById: currentUser.uid,
                createdByEmail: currentUser.email
            });

            // 3. 更新「父層任務」文件，以便觸發「小紅點」
            await taskRef.update({
                lastCommentBy: currentUser.email,
                lastCommentAt: firebase.firestore.FieldValue.serverTimestamp(),
                viewedBy: [currentUser.uid] // 只包含留言者本人
            });

            // 4. (修正) 現在我們可以正確地記錄日誌了
            await logActivity('comment_added', currentOpenTaskId, { 
                commentId: docRef.id,
                taskName: commentsTaskName.textContent 
            });

            console.log('留言已成功送出！');
            addCommentForm.reset(); // 清空輸入框

        } catch (error) {
            console.error("送出留言失敗:", error);
            alert('送出留言失敗！');
        }
    });

    // --- 17. 更新任務指派 (Admin Only) ---
async function updateTaskAssignment(taskId, newUid, newDisplayName) {

    if (!userData || userData.role !== 'Admin') {
        alert('權限不足！只有管理員可以重新指派任務。');
        return;
    }
    try {
        await db.collection("tasks").doc(taskId).update({
            assignedToUid: newUid || null, 
            assignedToDisplay: newDisplayName
        });
        console.log(`任務 ${taskId} 已被管理員重新指派給 ${newDisplayName}`);
        if (userData.role === 'Admin') loadStatsDashboard();
    } catch (error) {
        console.error("更新任務指派失敗:", error);
        alert('更新指派失敗！');
    }
} 

// --- 18. (最終連動版) 載入統計儀表板 (Admin Only) ---
async function loadStatsDashboard() {
    // (防呆檢查... 保持不變)
    if (!userData || userData.role !== 'Admin' || !statsTableBody || !statsSummaryContainer) {
        return;
    }

    // --- ★ 核心修改 1：讀取「任務列表篩選器」的值 ★ ---
    // (我們直接讀取那兩個已經存在的篩選器)
    const selectedStatus = adminFilterStatus.value;
    const selectedUserUID = adminFilterUser.value;
    console.log(`儀表板摘要篩選：狀態=${selectedStatus}, 使用者=${selectedUserUID}`);

    // --- (計算本週起點... 保持不變) ---
    const now = new Date();
    const dayOfWeek = now.getDay(); 
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);

    // --- (初始化計數器... 保持不變) ---
    let weeklyCreatedCount = 0;
    let weeklyCompletedCount = 0;

    // (顯示「正在計算中...」... 保持不變)
    statsTableBody.innerHTML = '<tr><td colspan="5" style="padding: 8px; text-align: center;">正在計算中...</td></tr>';
    statsWeekCreated.textContent = '...';
    statsWeekCompleted.textContent = '...';

    try {
        // --- 1. 準備資料 (不變) ---
        // (我們仍然抓取「所有」使用者和任務，因為「總統計」表格需要它們)
        const usersSnapshot = await db.collection("users").get();
        const tasksSnapshot = await db.collection("tasks").get();

        // --- 2. 建立「總統計」物件 (不變) ---
        let stats = {};
        // (你原本初始化 'stats' 物件的程式碼... 保持不變)
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            stats[user.uid] = {
                name: user.displayName || user.email,
                role: user.role,
                uncompleted: 0,
                inProgress: 0,
                completed: 0,
                total: 0
            };
        });
        stats.unassigned = {
            name: "--- 未指派 ---",
            role: "N/A",
            uncompleted: 0,
            inProgress: 0,
            completed: 0,
            total: 0
        };

        // --- 3. 交叉比對並計算 (★ 核心修改 2) ---
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            
            // ▼▼▼ ★★★ 錯誤修正點 ★★★ ▼▼▼
            // (你很可能在上次複製時，遺漏了這兩行)
            const assignedToUid = task.assignedToUid; // 宣告變數 1
            const status = task.status;            // 宣告變數 2
            // ▲▲▲ ★★★ 修正點結束 ★★★ ▲▲▲

            // (A) 「總統計」邏輯 (現在可以安全使用變數了)
            let userStats = null;
            if (assignedToUid && stats[assignedToUid]) {
                userStats = stats[assignedToUid];
            } else {
                userStats = stats.unassigned;
            }
            userStats.total++;
            if (status === '已完成') { userStats.completed++; }
            else if (status === '進行中') { userStats.inProgress++; }
            else { userStats.uncompleted++; }

            // (B) 「週統計」邏輯 (現在可以安全使用變數了)
            let userFilterPassed = false;
            if (selectedUserUID === 'all-tasks') {
                userFilterPassed = true;
            } else if (selectedUserUID === 'unassigned') {
                userFilterPassed = (assignedToUid === null); 
            } else {
                userFilterPassed = (assignedToUid === selectedUserUID);
            }
            let statusFilterPassed = false;
            if (selectedStatus === 'all') {
                statusFilterPassed = true;
            } else {
                statusFilterPassed = (status === selectedStatus); 
            }
            if (userFilterPassed && statusFilterPassed) {
                const createdAtTimestamp = task.createdAt;
                if (createdAtTimestamp && createdAtTimestamp.toDate() >= startOfWeek) {
                    weeklyCreatedCount++;
                }
                const completedAtTimestamp = task.completedAt;
                if (completedAtTimestamp && completedAtTimestamp.toDate() >= startOfWeek) {
                    weeklyCompletedCount++;
                }
            }
        });

        // --- 4. 將「本週」統計結果顯示在 HTML 上 (不變) ---
        statsWeekCreated.textContent = weeklyCreatedCount;
        statsWeekCompleted.textContent = weeklyCompletedCount;
        statsSummaryContainer.style.display = 'flex'; 

        // --- 5. 將「總統計」結果顯示在 HTML 上 (不變) ---
        statsTableBody.innerHTML = '';
        // (後續的 sortedStats 和 forEach ... 保持不變)
        const sortedStats = Object.values(stats).sort((a, b) => {
            const roleOrder = { "Admin": 1, "教學組長": 2, "業務": 3, "N/A": 4 };
            return (roleOrder[a.role] || 5) - (roleOrder[b.role] || 5);
        });
        sortedStats.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 8px;"><strong>${data.name}</strong> (${data.role})</td>
                <td style="padding: 8px; text-align: center;">${data.uncompleted}</td>
                <td style="padding: 8px; text-align: center;">${data.inProgress}</td>
                <td style="padding: 8px; text-align: center;">${data.completed}</td>
                <td style="padding: 8px; text-align: center;"><strong>${data.total}</strong></td>
`;
            statsTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("載入統計儀表板失敗:", error);
        statsTableBody.innerHTML = '<tr><td colspan="5" style="color: red; padding: 8px; text-align: center;">載入統計失敗！</td></tr>';
        statsWeekCreated.textContent = '錯誤';
        statsWeekCompleted.textContent = '錯誤';
    }
}

// --- 19. (全新) Admin 任務篩選監聽器 (★ 加入除錯功能版) ---
function listenForAdminTasks() {
    
    // ▼▼▼ ★★★ 新增的除錯日誌 ★★★ ▼▼▼
    console.log("--- 篩選器已觸發 (listenForAdminTasks) ---");
    // ▲▲▲ ★★★ 新增的除錯日誌 ★★★ ▲▲▲

    // 1. 停止舊的監聽 (如果存在的話)
    if (tasksListener) {
        tasksListener(); // 執行 "unsubscribe" 函式
        console.log("已停止舊的任務監聽");
    }

    // 2. 讀取篩選條件
    const selectedStatus = adminFilterStatus.value;
    const selectedUserUID = adminFilterUser.value;

    // ▼▼▼ ★★★ 新增的除錯日誌 ★★★ ▼▼▼
    console.log(`篩選條件：狀態 = ${selectedStatus}, 使用者 = ${selectedUserUID}`);
    // ▲▲▲ ★★★ 新增的除錯日誌 ★★★ ▲▲▲

    // 3. 建立 Firestore 查詢
    let query = db.collection("tasks");

    // 3a. 篩選「狀態」
    if (selectedStatus !== 'all') {
        query = query.where("status", "==", selectedStatus);
    }

    // 3b. 篩選「指派對象」
    if (selectedUserUID === 'unassigned') {
        // 特殊情況：篩選「未指派」
        query = query.where("assignedToUid", "==", null);
    } else if (selectedUserUID !== 'all-tasks') {
        // 篩選「特定使用者」
        query = query.where("assignedToUid", "==", selectedUserUID);
    }
    // (如果是 'all-tasks', 我們就不加 .where 條件)

    // 4. 加上排序
    // (★ 關鍵錯誤點修正：如果你同時用了 .where 和 .orderBy
    // (在「不同」的欄位上)，你「必須」也要在 .orderBy 中包含那個 .where 欄位
    // (或是建立複合索引)。我們改成只用 .orderBy('createdAt') 
    // (如果沒有 .where 的話) 或 .orderBy('status').orderBy('createdAt')
    
    // (★ 為了簡化，我們暫時先只用 'createdAt' 排序)
    // (如果你的 .where 查詢變多，Firestore 會在主控台提示你建立索引)
    query = query.orderBy("createdAt", "desc");

    // 5. 啟動新的監聽
    console.log("正在啟動新的任務監聽...");
    tasksListener = query.onSnapshot((snapshot) => {
        console.log("偵測到 [Admin 篩選] 任務資料變動！");
        const tasks = snapshot.docs;
        displayTasks(tasks); 
    }, (error) => {
        
        // ▼▼▼ ★★★ 強化版的錯誤處理 ★★★ ▼▼▼
        console.error("【!!! Admin 讀取任務時發生嚴重錯誤 !!!】:", error);
        
        // 這是最常見的錯誤：缺少「複合索引」
        if (error.code === 'failed-precondition') {
            alert("【查詢失敗】\n\n您的篩選器需要建立一個新的「複合索引」。\n\n請「檢查主控台(Console)」中的紅色錯誤訊息，並「點擊」錯誤訊息中的連結來自動建立索引。");
            console.error("Firestore 索引錯誤！請點擊以下連結建立索引：", error.message);
        } else {
            alert('讀取任務列表失敗！' + error.message);
        }
        // ▲▲▲ ★★★ 強化版的錯誤處理 ★★★ ▲▲▲
    });
}

    console.log("所有事件已綁定完畢。");

});