const roleButtons=[...document.querySelectorAll('.role-btn')];
const roleBlocks=[...document.querySelectorAll('.role-only')];
function setRole(role){
  roleButtons.forEach(b=>b.classList.toggle('active',b.dataset.role===role));
  roleBlocks.forEach(el=>el.classList.toggle('hidden',!el.classList.contains(role)));
  localStorage.setItem('ugs-role-v2',role);
}
roleButtons.forEach(b=>b.addEventListener('click',()=>setRole(b.dataset.role)));
setRole(localStorage.getItem('ugs-role-v2')||'student');

const search=document.getElementById('search'), sections=[...document.querySelectorAll('main section')], empty=document.getElementById('empty');
search.addEventListener('input',()=>{
  const q=search.value.trim().toLowerCase(); let shown=0;
  sections.forEach(s=>{const hit=!q||((s.dataset.search||'')+' '+s.innerText).toLowerCase().includes(q);s.style.display=hit?'':'none';if(hit)shown++});
  empty.style.display=shown?'none':'block';
});

const steps={
start:{q:'Учитель визначив правила використання ШІ для цього завдання?',c:[['Так','rules'],['Ні','default']],r:'<strong>Відповідайте на запитання</strong>Правила конкретного завдання мають пріоритет.'},
rules:{q:'Чи дозволяють ці правила саме такий спосіб використання ШІ?',c:[['Так','impact'],['Ні','stop']],r:'<strong>Орієнтуйтеся на умови завдання</strong>'},
default:{q:'Ви хочете лише пояснення, тренування, пошук ідей або перевірку власної роботи?',c:[['Так','support'],['Ні','final']],r:'<strong>Діє базове правило</strong>'},
support:{q:'Чи буде результат ШІ безпосередньо поданий на оцінювання?',c:[['Так','final'],['Ні','ok']],r:'<strong>Схоже на допоміжне використання</strong>'},
impact:{q:'Чи істотно ШІ вплинув на зміст, структуру, висновки або результат?',c:[['Так','declare'],['Ні','ok']],r:'<strong>Використання дозволене</strong>'},
stop:{q:'—',c:[],r:'<strong style="color:var(--red)">Не використовуйте ШІ цим способом</strong>Це суперечить умовам конкретного завдання.'},
final:{q:'—',c:[],r:'<strong style="color:var(--red)">За базовим правилом — не можна</strong>Без дозволу вчителя ШІ не має створювати фінальний текст, код, розв’язання або інший результат, що подається на оцінювання.'},
ok:{q:'—',c:[],r:'<strong style="color:var(--green)">Можна як допоміжний інструмент</strong>Перевіряйте факти та дотримуйтеся правил безпеки.'},
declare:{q:'—',c:[],r:'<strong style="color:var(--green)">Можна, але зазначте використання ШІ</strong>Вкажіть інструмент і коротко опишіть спосіб використання.'}
};
const fq=document.getElementById('flowQuestion'),fc=document.getElementById('flowChoices'),fr=document.getElementById('flowResult');
function renderStep(id){const s=steps[id];fq.textContent=s.q;fc.innerHTML='';s.c.forEach(([t,n])=>{const b=document.createElement('button');b.className='choice';b.textContent=t;b.onclick=()=>renderStep(n);fc.appendChild(b)});fr.innerHTML=s.r}
document.getElementById('resetFlow').onclick=()=>renderStep('start');renderStep('start');

document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
 document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');
 document.querySelectorAll('.teacher-use').forEach(x=>x.classList.remove('active'));document.getElementById(t.dataset.tab).classList.add('active');
}));
document.querySelectorAll('.reveal').forEach(b=>b.addEventListener('click',()=>{const el=document.getElementById(b.dataset.target);el.style.display=el.style.display==='block'?'none':'block'}));

const cases=[
{role:'student',status:'Залежить',cls:'warn',title:'ChatGPT склав план есе',text:'Може бути допустимо. Якщо план істотно визначив структуру роботи — зазначте використання ШІ.'},
{role:'student',status:'Залежить',cls:'warn',title:'Gemini переписав мій абзац',text:'Незначне мовне редагування і суттєве переписування — різні речі. Якщо внесок істотний, його треба зазначити.'},
{role:'student',status:'Дозволено',cls:'good',title:'Canva AI створила картинку для презентації',text:'Можна, якщо це дозволено умовами завдання. Якщо зображення є істотною частиною результату — зазначте використання ШІ.'},
{role:'student',status:'Залежить',cls:'warn',title:'ШІ написав код для проєкту',text:'Лише якщо це дозволено завданням. Учень має розуміти код, пояснити його і зазначити істотний внесок ШІ.'},
{role:'student',status:'Дозволено',cls:'good',title:'Я переклав чернетку через ШІ',text:'Технічна допомога дозволена, але істотний вплив на зміст або стиль може вимагати зазначення.'},
{role:'student',status:'Не дозволено',cls:'bad',title:'ChatGPT на контрольній без дозволу',text:'Не можна. Це використання ШІ для отримання недозволеної допомоги.'},
{role:'student',status:'Не автоматично',cls:'warn',title:'AI-detector показав 98%',text:'Це не є самостійним доказом порушення. Учень має право пояснити процес створення роботи.'},
{role:'student',status:'Дозволено',cls:'good',title:'Учень 11 років працює з ШІ разом із учителем',text:'Можливо у керованому середовищі та якщо такий спосіб використання допускають правила сервісу.'},
{role:'student',status:'Залежить',cls:'warn',title:'Учень 13 років створює власний акаунт',text:'Потрібно перевірити вікові вимоги конкретного сервісу. Правило UGS не скасовує правила платформи.'},
{role:'student',status:'Перевірити',cls:'warn',title:'ШІ навів джерело, якого немає',text:'Типова галюцинація. Джерела, цитати й важливі факти потрібно перевіряти.'},
{role:'student',status:'Не дозволено',cls:'bad',title:'ШІ-зображення або відео однокласника, що вводить в оману',text:'Якщо такий контент є шкідливим, оманливим або порушує права іншої особи чи правила Школи — його створення або поширення не допускається.'},
{role:'teacher',status:'Дозволено',cls:'good',title:'Учитель створив тест через Gemini',text:'Можна після критичної перевірки та редагування матеріалу перед використанням.'},
{role:'teacher',status:'Дозволено',cls:'good',title:'ШІ перевірив тест з однозначними відповідями',text:'Автоматизована перевірка такого типу завдань допускається.'},
{role:'teacher',status:'Залежить',cls:'warn',title:'Учитель вставив есе учня в ChatGPT',text:'Не слід завантажувати ідентифіковану роботу у загальнодоступний сервіс. Перевага — знеособлення або схвалене середовище.'},
{role:'teacher',status:'Не дозволено',cls:'bad',title:'ШІ сам поставив фінальну оцінку за есе',text:'Не можна. Остаточне рішення має прийняти педагог.'},
{role:'teacher',status:'Дозволено',cls:'good',title:'ШІ підготував чернетку feedback',text:'Можна, але вчитель перевіряє точність, відповідність роботі та тон повідомлення.'},
{role:'teacher',status:'Дозволено',cls:'good',title:'ШІ адаптував один текст на три рівні',text:'Це відповідає дозволеній диференціації та персоналізації навчальних матеріалів.'},
{role:'admin',status:'Дозволено',cls:'good',title:'ШІ допомагає з чернеткою документа',text:'Можна за умови дотримання правил щодо персональних і конфіденційних даних.'},
{role:'admin',status:'Залежить',cls:'warn',title:'ШІ аналізує дані для управлінського рішення',text:'Можна як допоміжний інструмент. Чим істотніший вплив на права чи добробут людей, тим більшим має бути людський контроль.'},
{role:'admin',status:'Не автоматично',cls:'warn',title:'Алгоритм автоматично вирішує питання, що впливає на права учня',text:'Потрібні людський контроль, можливість втручання та перевірки такого рішення.'}
];
const grid=document.getElementById('caseGrid');
function drawCases(filter='all'){grid.innerHTML='';cases.filter(c=>filter==='all'||c.role===filter).forEach(c=>{const d=document.createElement('div');d.className='case';d.innerHTML=`<div class="badge ${c.cls}">${c.status}</div><h3>${c.title}</h3><p>Натисніть, щоб побачити пояснення</p><div class="case-detail">${c.text}</div>`;d.onclick=()=>d.classList.toggle('open');grid.appendChild(d)})}
drawCases();
document.querySelectorAll('.filter').forEach(f=>f.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));f.classList.add('active');drawCases(f.dataset.filter)});

const qs=[
['Учитель нічого не сказав про ШІ. Чи можна згенерувати фінальний текст домашнього есе?',['Так','Ні'],1,'Базове правило не дозволяє ШІ створювати фінальний результат, що подається на оцінювання.'],
['ШІ істотно вплинув на структуру роботи. Що робити?',['Нічого','Зазначити інструмент і спосіб використання'],1,'Істотний внесок потрібно зазначати.'],
['AI-detector може бути єдиною підставою для встановлення порушення?',['Так','Ні'],1,'Ні, це лише допоміжна інформація.'],
['ШІ може самостійно виставити підсумкову оцінку за творчу роботу?',['Так','Ні'],1,'Фінальне педагогічне рішення приймає вчитель.'],
['Що краще для аналізу учнівської роботи?',['Завантажити роботу з ПІБ у будь-який сервіс','Знеособити або використати схвалене середовище'],1,'Перевага надається мінімізації даних і схваленим середовищам.'],
['13 і 14 років у Політиці означають одне й те саме?',['Так','Ні'],1,'13 років — про самостійне використання; 14 — про академічну відповідальність.'],
['Як ставитися до посилання, яке дав ШІ?',['Вважати достовірним','Перевірити'],1,'ШІ може вигадувати джерела та цитати.']
];
const qb=document.getElementById('quizBox'),scoreEl=document.getElementById('score');let score=0,done=new Set();
function drawQuiz(){qb.innerHTML='';score=0;done=new Set();scoreEl.textContent='0 / 7';qs.forEach((q,i)=>{const box=document.createElement('div');box.className='quiz-q';box.innerHTML=`<b>${i+1}. ${q[0]}</b><div class="quiz-options">${q[1].map((o,j)=>`<button data-v="${j}">${o}</button>`).join('')}</div><div class="hint"></div>`;box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(done.has(i))return;done.add(i);box.querySelectorAll('button').forEach(x=>x.disabled=true);if(+b.dataset.v===q[2]){b.classList.add('correct');score++}else{b.classList.add('wrong');box.querySelector(`button[data-v="${q[2]}"]`).classList.add('correct')}box.querySelector('.hint').textContent=q[3];scoreEl.textContent=`${score} / 7`});qb.appendChild(box)})}
drawQuiz();document.getElementById('resetQuiz').onclick=drawQuiz;
