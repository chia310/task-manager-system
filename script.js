// --- 抓取新加入的 HTML 元素 ---
const createTaskForm = document.getElementById('create-task-form');
const taskNameInput = document.getElementById('summary');
const taskDescInput = document.getElementById('task-desc');
const taskListContainer = document.getElementById('task-list-container');
const adminPanel = document.getElementById('admin-panel');
const userListBody = document.getElementById('user-list-body');
const commentsModal = document.getElementById('comments-modal');
const closeCommentsBtn = document.getElementById('close-comments-btn');
const commentsTaskName = document.getElementById('comments-task-name');
const commentsListContainer = document.getElementById('comments-list-container');
const addCommentForm = document.getElementById('add-comment-form');
const commentTextInput = document.getElementById('comment-text');
const statsTableBody = document.getElementById('stats-table-body');


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

// --- 抓取 HTML 元素 ---
// 抓取我們需要互動的所有網頁元素
const authContainer = document.getElementById('auth-container');
const taskDashboard = document.getElementById('task-dashboard');
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const registerButton = document.getElementById('register-button');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email');

// --- 1. 註冊功能 (★★★ 升級版 ★★★) ---
registerButton.addEventListener('click', () => {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    if (!email || !password) {
        alert('請輸入電子郵件和密碼！');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // 註冊成功後，我們立刻在 "users" 集合中為他建立一份資料
            const user = userCredential.user;
            
            // 使用 .doc(user.uid) 可以確保 users 集合中的文件 ID 和 Auth 的 user ID 保持一致
            db.collection("users").doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                role: "業務", // 預設新註冊的使用者為 "業務"
                displayName: email.split('@')[0] // 預設顯示名稱為 email @ 前的名字
            })
            .then(() => {
                console.log('使用者資料已成功寫入 Firestore');
                alert('帳號 ' + email + ' 註冊成功！請直接登入。');
                loginForm.reset(); // 清空表單
            })
            .catch((dbError) => {
                console.error('寫入 Firestore 失敗:', dbError);
                alert('註冊成功，但建立使用者資料時失敗！');
            });
        })
        .catch((error) => {
            // 註冊失敗
            console.error('註冊失敗:', error.message);
            if (error.code === 'auth/weak-password') {
                alert('註冊失敗：密碼強度不足，至少需要 6 個字元！');
            } else if (error.code === 'auth/email-already-in-use') {
                alert('註冊失敗：這個 Email 已經被註冊了！');
            } else {
                alert('註冊失敗：' + error.message);
            }
        });
});

// --- 2. 登入功能 ---
loginForm.addEventListener('submit', (event) => {
    event.preventDefault(); // 防止表單提交時頁面重新整理

    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    if (!email || !password) {
        alert('請輸入電子郵件和密碼！');
        return;
    }

    // 使用 Firebase auth 服務來登入
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // D登入成功
            console.log('登入成功!', userCredential.user);
            // 登入成功後要做什麼，我們會在下面的「狀態監聽」中處理
        })
        .catch((error) => {
            // 登入失敗
            console.error('登入失敗:', error.message);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                alert('登入失敗：電子郵件或密碼錯誤！');
            } else {
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
    
    let tasksListener = null; 

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
            loadUserManagementTable(); 
            loadStatsDashboard();
        } else {
            adminPanel.style.display = 'none'; 
        }

        // 必須「等待」使用者名單載入完成 (填滿 allUsersList 快取)
        await loadUsersDropdown('assign-to-user'); 

        // 現在 allUsersList 已經有資料了，再開始監聽任務
        let query;
        if (userData.role === 'Admin') {
            console.log("查詢模式：管理員 (讀取所有任務)");
            query = db.collection("tasks")
                .orderBy("createdAt", "desc");
        } else {
            console.log("查詢模式：一般使用者 (讀取個人及未指派任務)");
            query = db.collection("tasks")
                .where("assignedToUid", "in", [null, user.uid])
                .orderBy("createdAt", "desc");
        }

        tasksListener = query.onSnapshot((snapshot) => {
            console.log("偵測到任務資料變動！");
            const tasks = snapshot.docs; 
            displayTasks(tasks); // (現在 displayTasks 可以安全地讀取全域 userData 了)
        }, (error) => {
            console.error("讀取任務時發生錯誤:", error);
            if (error.code === 'failed-precondition') {
                alert("讀取任務失敗！您的查詢需要建立新的資料庫索引。\n\n請「檢查主控台(Console)」中的錯誤訊息，並「點擊」錯誤訊息中的連結來自動建立索引。");
                console.error("Firestore 索引錯誤！請點擊以下連結建立索引：", error.message);
            } else {
                alert('讀取任務列表失敗！');
            }
        });

    } else {
        // --- 使用者已登出 ---
        console.log('使用者已登出');
        userData = null; 
        allUsersList = []; 

        taskDashboard.style.display = 'none';
        authContainer.style.display = 'block';
        adminPanel.style.display = 'none'; 

        if (tasksListener) {
            tasksListener(); 
            console.log("已停止監聽任務列表");
        }
        if (taskListContainer) {
            taskListContainer.innerHTML = '';
        }
    }
});



// --- 5. 建立新任務 (Create) (★★★ 升級版 ★★★) ---
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

// --- 6. 讀取與顯示任務 (Read) (★★★ 升級版，Admin 可編輯指派 ★★★) ---
function displayTasks(tasks) {
    taskListContainer.innerHTML = ''; 
    if (tasks.length === 0) {
        taskListContainer.innerHTML = '<p>目前沒有任何任務。</p>';
        return;
    }
    const currentUser = auth.currentUser; 

    tasks.forEach(task => {
        const taskData = task.data(); 
        const taskId = task.id; 

        const taskElement = document.createElement('div');
        taskElement.classList.add('task-item'); 
        taskElement.setAttribute('data-id', taskId); 

        const assignedToText = taskData.assignedToDisplay || "未指派"; 
        
        const isCreator = currentUser && currentUser.uid === taskData.createdById;
        const isAdmin = userData && userData.role === 'Admin';
        const isAssigned = currentUser && currentUser.uid === taskData.assignedToUid;

        const canDelete = (isAdmin || isCreator);
        const canUpdateStatus = (isAdmin || isCreator || isAssigned);

        // ★★★ 新邏輯：決定「指派對象」欄位要如何顯示 ★★★
        let assignedToHTML = '';
        if (isAdmin) {
            // 如果是 Admin，就建立一個完整的下拉選單
            let optionsHTML = '<option value="">-- 暫不指派 --</option>';
            
            // (我們假設 allUsersList 已經被 loadUsersDropdown 填滿了)
            let leadsGroup = '<optgroup label="教學組長">';
            let salesGroup = '<optgroup label="業務同仁">';
            let adminGroup = '<optgroup label="管理員">';

            allUsersList.forEach(user => {
                const selected = (user.uid === taskData.assignedToUid) ? 'selected' : '';
                const option = `<option value="${user.uid}" ${selected}>${user.displayName || user.email}</option>`;
                
                if (user.role === '教學組長') leadsGroup += option;
                else if (user.role === '業務') salesGroup += option;
                else if (user.role === 'Admin') adminGroup += option;
            });

            leadsGroup += '</optgroup>';
            salesGroup += '</optgroup>';
            adminGroup += '</optgroup>';
            optionsHTML += adminGroup + leadsGroup + salesGroup;

            // `data-task-id` 是為了讓監聽器知道要更新哪一筆
            assignedToHTML = `
                <p><strong>指派給：</strong>
                    <select class="assign-task-select" data-task-id="${taskId}">
                        ${optionsHTML}
                    </select>
                </p>`;
        } else {
            // 如果是 F般使用者，就只顯示純文字
            assignedToHTML = `<p><strong>指派給：</strong>${assignedToText}</p>`;
        }
        // ★★★ 新邏輯結束 ★★★

        taskElement.innerHTML = `
            <h3>${taskData.name}</h3>
            <p>${taskData.description}</p>
            
            ${assignedToHTML} <p><small>建立者：${taskData.createdByEmail}</small></p>
            
            <div class="task-actions">
                <label for="status-select-${taskId}"><strong>狀態：</strong></label>
                <select class="status-select" data-id="${taskId}" ${!canUpdateStatus ? 'disabled' : ''}>
                    <option value="未完成" ${taskData.status === '未完成' ? 'selected' : ''}>未完成</option>
                    <option value="進行中" ${taskData.status === '進行中' ? 'selected' : ''}>進行中</option>
                    <option value="已完成" ${taskData.status === '已完成' ? 'selected' : ''}>已完成</option>
                </select>

                <button class="comments-btn" data-id="${taskId}" data-name="${taskData.name}">留言</button>
                ${canDelete ? `<button class="delete-task-btn" data-id="${taskId}">刪除任務</button>` : ''}
            </div>
        `;
        taskListContainer.appendChild(taskElement);
    });
}

// --- ★★★ 修改「登入狀態監聽」函式 ★★★ ---
// 我們需要升級舊的 onAuthStateChanged 函式，
// 讓它在使用者登入後，自動去讀取任務列表
//
//
auth.onAuthStateChanged((user) => {

    let tasksListener = null; 

    if (user) {
        // --- 使用者已登入 ---
        console.log('使用者已登入:', user.email);

        taskDashboard.style.display = 'block';
        authContainer.style.display = 'none';
        userEmailDisplay.textContent = user.email;

        // ★★★ 新增：呼叫函式來載入使用者名單 ★★★
        loadUsersDropdown();

        // ★★★【新功能】即時監聽任務列表 ★★★
        // .orderBy("createdAt", "desc") 讓最新的任務顯示在最上面
        tasksListener = db.collection("tasks")
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                // 當資料庫有任何變動時，這段程式碼就會自動執行
                console.log("偵測到任務資料變動！");
                const tasks = snapshot.docs; // 取得所有任務的文件
                displayTasks(tasks); // 呼叫函式來更新畫面
            }, (error) => {
                console.error("讀取任務時發生錯誤:", error);
                alert('讀取任務列表失敗！');
            });

    } else {
        // --- 使用者已登出 ---
        console.log('使用者已登出');
        userData = null;

        taskDashboard.style.display = 'none';
        authContainer.style.display = 'block';

        // ★★★【新功能】停止監聽 ★★★
        // 當使用者登出時，我們必須停止監聽資料庫，以節省資源
        if (tasksListener) {
            tasksListener(); // 呼叫這個函式即可停止監聽
            console.log("已停止監聽任務列表");
        }
        taskListContainer.innerHTML = ''; // 清空任務列表
    }
});

// --- 7. 載入使用者名單到下拉選單 (★★★ 升級版，含快取 ★★★) ---
async function loadUsersDropdown(selectElementId) {
    const selectElement = document.getElementById(selectElementId);
    if (!selectElement) {
        console.error(`找不到 ID 為 ${selectElementId} 的下拉選單`);
        return; 
    }
    
    // 暫存第一個 "暫不指派" 或 "請選擇" 選項
    const firstOption = selectElement.options[0];
    selectElement.innerHTML = ''; 
    selectElement.appendChild(firstOption); 

    // ★ 新增：清空全域快取，準備重新載入 ★
    allUsersList = [];

    try {
        const snapshot = await db.collection("users").orderBy("role").orderBy("displayName").get();
        
        let leadsGroup = document.createElement('optgroup');
        leadsGroup.label = '教學組長';
        let salesGroup = document.createElement('optgroup');
        salesGroup.label = '業務同仁';
        let adminGroup = document.createElement('optgroup');
        adminGroup.label = '管理員';

        snapshot.forEach(doc => {
            const user = doc.data();
            
            // ★ 新增：將使用者存入全域快取 ★
            allUsersList.push(user);

            const option = document.createElement('option');
            option.value = user.uid; 
            option.textContent = user.displayName || user.email; 

            if (user.role === '教學組長') leadsGroup.appendChild(option);
            else if (user.role === '業務') salesGroup.appendChild(option);
            else if (user.role === 'Admin') adminGroup.appendChild(option);
        });

        if (adminGroup.children.length > 0) selectElement.appendChild(adminGroup);
        if (leadsGroup.children.length > 0) selectElement.appendChild(leadsGroup);
        if (salesGroup.children.length > 0) selectElement.appendChild(salesGroup);

    } catch (error) {
        console.error("載入使用者名單失敗:", error);
    }
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

// --- 12. 更新任務狀態 (Update) ---
async function updateTaskStatus(taskId, newStatus) {
    try {
        await db.collection("tasks").doc(taskId).update({
            status: newStatus
        });
        console.log(`任務 ${taskId} 狀態已更新為 ${newStatus}`);
        if (userData.role === 'Admin') loadStatsDashboard();
    } catch (error) {
        console.error("更新任務狀態失敗:", error);
        alert('更新狀態失敗！');
    }
}

// --- 13. 刪除任務 (Delete) ---
async function deleteTask(taskId, taskName) {
    if (confirm(`確定要刪除任務 "${taskName}" 嗎？\n這個動作無法復原！`)) {
        try {
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
});

// --- 15. 留言功能相關 ---

// 我們需要這兩個全域變數來管理「即時監聽」的狀態
let currentOpenTaskId = null; // 存放目前打開的任務 ID
let commentsListener = null; // 存放留言的即時監聽器

// 函式：打開留言彈窗
function openCommentsModal(taskId, taskName) {
    currentOpenTaskId = taskId; // 存下任務 ID
    commentsTaskName.textContent = taskName; // 顯示任務標題
    commentsListContainer.innerHTML = '<p>正在載入留言...</p>';
    commentsModal.style.display = 'flex';

    // ★ 啟動一個新的「即時監聽器」，專門監聽這個任務的 "comments" 子集合 ★
    commentsListener = db.collection("tasks").doc(taskId).collection("comments")
        .orderBy("createdAt", "asc") // 按照時間排序
        .onSnapshot((snapshot) => {
            const comments = snapshot.docs;
            displayComments(comments); // 呼叫函式來顯示留言
        }, (error) => {
            console.error("載入留言失敗:", error);
            commentsListContainer.innerHTML = '<p>載入留言失敗！</p>';
        });
}

// 函式：關閉留言彈窗
function closeCommentsModal() {
    // ★ 關閉彈窗時，必須「停止」即時監聽，以節省資源 ★
    if (commentsListener) {
        commentsListener(); // 呼叫儲存的監聽器函式即可停止
        commentsListener = null;
    }
    currentOpenTaskId = null;
    commentsModal.style.display = 'none';
    addCommentForm.reset();
}

// 函式：將留言陣列顯示在畫面上
function displayComments(comments) {
    commentsListContainer.innerHTML = ''; // 清空舊留言
    if (comments.length === 0) {
        commentsListContainer.innerHTML = '<p>目前沒有任何留言。</p>';
        return;
    }

    comments.forEach(commentDoc => {
        const comment = commentDoc.data();
        
        // 將 Firebase 的 timestamp 轉換為可讀的日期時間
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
    
    // 讓滾動條自動滾到最下面，顯示最新留言
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
        // 在 "tasks" -> {任務ID} -> "comments" 子集合中新增一筆留言
        await db.collection("tasks").doc(currentOpenTaskId).collection("comments").add({
            text: commentText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdById: currentUser.uid,
            createdByEmail: currentUser.email
        });

        console.log('留言已成功送出！');
        addCommentForm.reset(); // 清空輸入框
        // (onSnapshot 監聽器會自動幫我們更新畫面)

    } catch (error) {
        console.error("送出留言失敗:", error);
        alert('送出留言失敗！');
    }
});

// --- 17. 更新任務指派 (Admin Only) ---
async function updateTaskAssignment(taskId, newUid, newDisplayName) {
    // 再次檢查權限 (雖然只有 Admin 看得到選單，但多一層防護總是好的)
    if (!userData || userData.role !== 'Admin') {
        alert('權限不足！只有管理員可以重新指派任務。');
        return;
    }

    try {
        await db.collection("tasks").doc(taskId).update({
            assignedToUid: newUid || null, // 如果 newUid 是空字串 (未指派)，就存 null
            assignedToDisplay: newDisplayName
        });
        console.log(`任務 ${taskId} 已被管理員重新指派給 ${newDisplayName}`);
        if (userData.role === 'Admin') loadStatsDashboard();
    } catch (error) {
        console.error("更新任務指派失敗:", error);
        alert('更新指派失敗！');
    }
}

// --- 18. 載入統計儀表板 (Admin Only) ---
async function loadStatsDashboard() {
    // 只有 Admin 登入且元素存在時才執行
    if (!userData || userData.role !== 'Admin' || !statsTableBody) {
        return;
    }

    statsTableBody.innerHTML = '<tr><td colspan="5" style="padding: 8px; text-align: center;">正在計算中...</td></tr>';

    try {
        // --- 1. 準備資料 ---
        
        // 抓取所有使用者資料
        const usersSnapshot = await db.collection("users").get();
        // 抓取所有任務資料
        const tasksSnapshot = await db.collection("tasks").get();

        // --- 2. 建立統計物件 ---
        let stats = {};

        // 根據使用者名單，初始化 stats 物件
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
        
        // 新增一個 "未指派" 的類別
        stats.unassigned = {
            name: "--- 未指派 ---",
            role: "N/A",
            uncompleted: 0,
            inProgress: 0,
            completed: 0,
            total: 0
        };

        // --- 3. 交叉比對並計算任務 ---
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            const assignedToUid = task.assignedToUid;
            const status = task.status;

            let userStats = null;
            
            if (assignedToUid && stats[assignedToUid]) {
                // 任務有指派，且該使用者存在
                userStats = stats[assignedToUid];
            } else {
                // 任務未指派 (null) 或被指派給一個已被刪除的使用者
                userStats = stats.unassigned;
            }

            // 開始計數
            userStats.total++;
            if (status === '已完成') {
                userStats.completed++;
            } else if (status === '進行中') {
                userStats.inProgress++;
            } else {
                // 預設 (包含 "未完成")
                userStats.uncompleted++;
            }
        });

        // --- 4. 將統計結果顯示在 HTML 上 ---
        statsTableBody.innerHTML = ''; // 清空
        
        // 將 stats 物件轉換為陣列並排序 (Admin 在最前, 組長次之, 業務最後)
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
    }
}