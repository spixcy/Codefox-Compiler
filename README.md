# CodeForge — Multi-Language Competitive Programming Platform


### RUN (local, instant)

| Language | Execution Engine | Mode |
|----------|-----------------|------|
| **Python 3** | Pyodide (WebAssembly) | Runs fully in-browser, zero backend calls |
| **Java** | Local OpenJDK 21 (via backend) | Compiles + runs with `javac`/`java` |
| **C++ 17** | Local GCC/G++ (via backend) | Compiles with `g++ -std=c++14 -O2` |
| **C (C11)** | Local GCC (via backend) | Compiles with `gcc -std=c11 -O2` |


### 1. Backend

```bash
cd backend
npm install
npx prisma generate
npx tsx src/index.ts
# → Server is running on port 3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```


so late if u want to use it for any desktop U CAN make it get embedded inside ur desktop and make cahanges in ur lib .rs file to make it auto start the backend and u  are good to goo

like this
<img width="208" height="437" alt="image" src="https://github.com/user-attachments/assets/fa8454ea-7406-4ed9-92d2-94818d7ff4fb" />


I am sorry C++ migth not work without imports , u need to manually import them
