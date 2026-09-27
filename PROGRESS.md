# Launch switches — progress (2026-09-27)

Goal: finalize dalatech.online once. Each AI staff member (Вира, Эхо, Нова, Ора) has its own
switch, off by default. Flipping one changes the website AND Дали's chat answers together, with
no code or copy edit. Branch `claude/amazing-fermat-lxyw21` in all three repos. **Nothing merged.**

## Status

| Part | Repo | State |
|---|---|---|
| 1. Switch platform (migration 0063, compile, fixed replies, reply cases, publish `--launch`, public read) | dala-ai | done, pushed, tests + SQL suites green |
| 2. Tenant #0 rows for both states (SQL, drafts) | dala-ai | done, pushed, verified on a local replica |
| 3. Site chatbot: Нова wording, neutral widget text | dalatech-chatbot | done, pushed, `npm run check` green |
| 4. Website: live mode, preview switches, wording audit | dalatech-online | done, pushed, build green |
| 5. Pre-publish model check (tenant #0) | — | **not run: no Anthropic key in this cloud session** |

## How a switch is flipped (after merge, on the founder's machine)

    cd dala-ai && git pull && npm install
    # dry run: every reply case and the fact check, judged with Вира live; writes nothing
    node scripts/publish/tenant.ts --slug dalatech --launch "Вира — маркетинг менежер=live"
    # the model check the founder approved (D-151), spends ~$0.04 a case
    node scripts/publish/tenant.ts --slug dalatech --launch "Вира — маркетинг менежер=live" --with-model
    # flip it: writes the switch and publishes; the site follows within ~30 s
    node scripts/publish/tenant.ts --slug dalatech --launch "Вира — маркетинг менежер=live" --publish

Names: «Вира — маркетинг менежер», «Эхо — утасны оператор», «Нова — сануулга, SMS»,
«Ора — хувийн туслах». Back to pre-registration: `=preregistration`.

## Order to ship (after approval)

1. Push migration `0063` to Supabase; read the ledger.
2. Merge + deploy dala-ai (the public read `/api/web/launch/<channel>` goes live).
3. Run `scripts/provision/dalatech-launch-switches-2026-09-27.sql`, then publish tenant #0 in
   the same sitting (all four still off: the chat's text stays as today, Нова without ТИЙМ/ҮГҮЙ).
4. Merge dalatech-chatbot and dalatech-online.

Until step 2, the website shows today's states (the read 404s and the page keeps its defaults).

## Verified

- dala-ai: `npm test` 2250 pass; guards green; every migration + catalog/isolation/rls/spend/
  retention/query-columns on scratch PostgreSQL 16.
- Tenant #0 replica (local PostgreSQL + PostgREST, rows copied read-only; compiles to production's
  exact content_hash `d76b2c60…`): the real publish command, after the provisioning SQL —
  all off 65/65 deterministic cases pass (today's price overview byte for byte); Вира, Эхо, Нова,
  Ора each live, and all four live: every deterministic case passes; fact check agrees in every
  state. A `--launch … --publish` flip changed the snapshot and `/api/web/launch` together.
- Website: all-off page text equals today's except the audit lines below (diffed against a build
  of `main`); phone 390 px and desktop 1440 px in off / Вира-only / all-live; no page errors, no
  horizontal overflow; the animated day plays in sync.

## Open items for the founder

- **Эхо has no approved price.** Live mode still says «Үнийг хараахан зарлаагүй». Set the price
  (rows + `src/office/agents.js`) before flipping Эхо.
- **Legal pages** (`/privacy`, `/terms`, `/data-deletion`) state that Эхо/Нова process no calls or
  SMS yet and that the four are pre-registration only. Those are legal disclosures and must be
  rewritten with the real data handling before Эхо or Нова launches; not switched, not changed.
- **Reply cases:** the 16 strings «X одоо ажиллаж байна / байгаа / идэвхтэй …» move out of the
  generic must-not lists into one case per staff member per state (true only while X is coming soon).
- **Model check:** run the `--with-model` dry run above; this session has no key.

## Wording audit — every changed line (old → new), for approval

Website (mn):
1. «DalaTech-ийн Facebook хуудасны аль ч постын доор «1» гэж коммент бичвэл бид тантай холбогдоно.» → removed
2. «Шифрлэгдсэн түлхүүр» → «Хуудас тань хамгаалагдсан»
3. «Танай хуудас, сувагт нэвтрэх түлхүүрүүд шифрлэгдсэн байна.» → «Танай хуудсанд олгосон эрхийг шифрлэн хадгалж, зөвхөн харилцагчдад хариулахад ашиглана.»
4. «Эзэнд нь шилжүүллээ» → «Танд шилжүүллээ»
5. LiveDemo: «…илгээнэ. Таамаглахгүй, хөнгөлөлтийг өөрөө амлахгүй: шийдвэрийг танд шилжүүлнэ. Танай бизнест тохируулсан Далиг бид үзүүлнэ.» → «…илгээнэ. Танай бизнест тохируулсан Далиг бид танилцуулна.» (the no-discount point is already shown by the demo itself)
6. «Маягт 1 минут. Бид утсаар холбогдоно.» → «Маягт бөглөхөд 1 минут. Бид утсаар холбогдоно.»
7. «Маягт нэг минут. Бид утсаар холбогдож, дэлгэрэнгүйг тохирно.» → «Маягт бөглөхөд нэг минут. Бид утсаар холбогдож, дэлгэрэнгүйг тохирно.»
8. «Вэбсайтыг бүтээж, танай бизнесийн агуулгаар (бүтээгдэхүүн, асуулт хариулт, бодлого) AI-г сургана. Танай саналд үндэслэн тохиргоог нарийвчилна.» → «Вэбсайтыг бүтээж, AI ажилтныг танай бүтээгдэхүүн, түгээмэл асуулт, нөхцөлийн мэдээллээр тохируулна. Таны саналаар тохиргоог нарийвчилна.»
9. «Системийг нээж, гүйцэтгэлийг хянана. Сарын багцтай бол агуулга, хариулт, системийн тогтвортой байдлыг тогтмол сайжруулна.» → «Ажиллуулж эхлээд гүйцэтгэлийг хянана. Агуулга, хариултын чанар, тогтвортой ажиллагааг тогтмол сайжруулна.»
10. «Агуулгын шинэчлэлт, сайжруулалт, засвар үйлчилгээг тогтмол гүйцэтгэнэ. Сарын багц сонголттой.» → «AI ажилтны сарын төлбөрт мэдээллийн шинэчлэлт, сайжруулалт, дэмжлэг багтана.» (no optional «сарын багц» exists)
11. «Системийг нээж, гүйцэтгэлийг хянана. Нээлтийн дараах эхний долоо хоногт өдөр тутмын дэмжлэг үзүүлнэ.» → «Ажиллуулж эхлээд гүйцэтгэлийг хянана. Эхний долоо хоногт өдөр бүр дэмжлэг үзүүлнэ.»
12. «QPay төлбөр, Далийн нэгтгэл» → «QPay төлбөр, Далигийн холболт»
13. «Хоёр ажилтан −10%, гурав −15%, дөрөв ба түүнээс дээш −20%. Хөнгөлөлт сарын төлбөрт хамаарна.» → «Хоёр ажилтан авбал сарын төлбөрт 10%, гурав бол 15%, дөрөв ба түүнээс дээш бол 20%-ийн хөнгөлөлт эдэлнэ.»
14. «Эхний өдрөөс харилцагчдад хариулна. Та зөвхөн сарын төлбөр төлнө.» → «AI ажилтан эхний өдрөөс ажлаа хийж, та зөвхөн сарын төлбөр төлнө.»
15. «Дуудлага алдахгүй» → «Дуудлага бүрт хариулна»
16. «Итгэл нь юу хийж чадахаас илүү, юу хийхгүйгээр тогтдог.» → «Дали таны тогтоосон хүрээнээс гарахгүй.»
17. /office search description: «…AI баг. Дали өнөөдрөөс харилцагч бүрт хариулна; Вира, Эхо, Нова, Ора удахгүй.» → «Орон тоо нэмэхгүйгээр ажлаа хуваалцах AI баг: хүлээн авагч, маркетинг менежер, утасны оператор, сануулга, хувийн туслах.» (never goes stale)
18. Launch offer button (hidden until switched on): «Суудал авах» → «Хүсэлт илгээх»
19. Link preview (description, og, twitter): «AI ажилтан + ухаалаг вэбсайт. Таны бизнес унтаж байхад ч хэрэглэгчдэд хариулна.» → «Монголын бизнест зориулсан AI ажилтан, ухаалаг вэбсайт. Та унтаж байхад ч харилцагч бүр хариугаа авна.»
20. Link preview image alt: «DalaTech logo» → «DalaTech лого»

Chat widget (dalatech-chatbot):
21. «Дали танай харилцагчидтай ярина. Вира, Эхо, Нова, Ора урьдчилан бүртгэл авч байна; Ора зөвхөн танд: бичиг баримт, танилцуулга, хугацаа. Хэн юу хийдэг, хэдэн төгрөг вэ? Асууна уу.» → «AI ажилтан бүр юу хийдэг, үнэ, хэрхэн эхлэх талаар асуултаа бичнэ үү.» (no status to go stale)
22. «Систем бэлэн» → «Онлайн»; button «📊 Вира, Эхо, Нова» → «📊 Бусад ажилтнууд»
23. Sent questions: «Вира, Эхо, Нова гурав юу хийдэг вэ?» → «Вира, Эхо, Нова юу хийдэг вэ?»; «Ора хэн бэ, юу хийдэг вэ? Бусад ажилтнаас юугаараа ялгаатай вэ?» → «Ора юу хийдэг вэ, бусад ажилтнаас юугаараа ялгаатай вэ?»; «Холбоо барих мэдээлэл өгнө үү?» → «Тантай хэрхэн холбогдох вэ?»
24. Errors: «Зурвас хэт урт байна. 2000 тэмдэгтээс богино байх ёстой.» → «Зурвас хэт урт байна. 2,000 тэмдэгтээс богино бичнэ үү.»; «Уучлаарай, хариулт алдагдсан байна.» → «Уучлаарай, хариулт ирсэнгүй. Дахин оролдоно уу.»; «Буруу оролт илэрсэн байна. Та энгийн асуулт асуугаарай.» → «Энэ зурвасыг хүлээн авах боломжгүй байна. Асуултаа энгийн текстээр бичнэ үү.»; «Харилцааны түүхийг устгах уу?» → «Яриаг цэвэрлэх үү?»; page title «DalaTech — AI Assistant» → «Дали — DalaTech»

Дали (tenant #0, approved wording applied): Нова «…ТИЙМ/ҮГҮЙ хариуг хүлээн авдаг AI ажилтан…» →
«Нова цагийн сануулгыг танай дугаараас SMS-ээр автоматаар илгээж, ирэхээ мартах харилцагчийг
цөөлнө.»; Вира, Эхо, Ора descriptions use the site's approved lines (KB and fallback prompt).

## New Mongolian copy (DRAFT, for approval)

Website, composed per switch (`staffText.*` in `src/locales/mn.json`); with all off, the page
reads exactly as today:
- «{{нэрс}} мөн ажиллаж байна.» · «{{нэрс}} түүнтэй хамт ажиллаж байна.»
- «Өнөөдөр {{нэрс}}. Удахгүй бүтэн баг.» · «Таван ажилтан. Нэг баг.» · «Дали танай харилцагчдад хариулна.» · «Маркетингийг Вира, дуудлагыг Эхо, сануулгыг Нова хариуцна.» · «Ора зөвхөн тантай ажиллана.»
- «Орон тоо нэмэхгүй AI баг: {{live}} өнөөдрөөс, {{soon}} удахгүй.» · «Орон тоо нэмэхгүй AI баг бүрэн бүрдлээ.» · «Эхо дуудлага бүрт хариулна.» · «Вира контент, сурталчилгааг хариуцна.» · «Нова цагийн сануулгыг танай дугаараас SMS-ээр илгээнэ.» · «Ора зөвхөн танд: бичиг баримт, хугацаа, шийдвэр.»
- «Өнөөдөр {{live}} ажиллаж байна; {{soon}} удахгүй.» · «Дали, Вира, Эхо, Нова танай харилцагчдад ажиллана.» · «Ора харилцагчидтай ярихгүй: таны ширээн дээрх ажлыг хариуцаж, цагийг тань чөлөөлнө.» · «Ора зөвхөн танд нээгддэг чатаар бичиг баримт, танилцуулга, хугацаа, шийдвэрт туслана.»
- Phone cards: «Вира · Танд — Өнөөдрийн пост нийтлэгдлээ — Шинэ үйлчилгээний тухай богино видео таны хуудсанд гарлаа.» · «Ора · Танд — Гэрээний төсөл бэлэн — Англиар ирсэн гэрээг монголоор хөрвүүлж, анхаарах хоёр заалтыг тэмдэглэлээ.» · «Нова · Болдод SMS — Сайн байна уу, Болд. Маргааш 11:00 цагт таны цаг товлогдсон байна.» · «Эхо · Танд — Хаах цагийн дараах дуудлага — Ганбаа 20:40-д залгалаа. Эхо хариулж, маргааш 15:00 цагийн захиалгыг бүртгэлээ.» · summary «Өнөөдөр танай баг» + «1 пост нийтэлсэн», «1 гэрээний төсөл бэлтгэсэн», «1 сануулга илгээсэн», «1 дуудлагад хариулсан»
- Status «Идэвхтэй», button «Хүсэлт илгээх» (existing words).

Дали (tenant #0 rows, `dala-ai/scripts/provision/dalatech-launch-switches-2026-09-27.sql`):
- Live KB line, each staff member: «Одоо ажиллаж байна. Эхлүүлэхийн тулд нэр, утасны дугаараа үлдээвэл манай ажилтан холбогдож тохиргоог хийнэ; ихэвчлэн 1–2 долоо хоногийн дотор ажиллаж эхэлдэг.»
- Нова live answer: «Нова цагийн сануулгыг танай дугаараас SMS-ээр автоматаар илгээж, ирэхээ мартах харилцагчийг цөөлнө. Сарын төлбөр 150,000₮ (1,000 SMS багтсан), суурилуулалт 50,000₮.»
- Price overview, live lines: «💬 Вира — маркетинг менежер: сард 350,000₮ (суурилуулалт 50,000₮)», «💬 Нова — сануулга, SMS: сард 150,000₮ (суурилуулалт 50,000₮)», «💬 Ора — хувийн туслах: сард 250,000₮ (суурилуулалт 50,000₮)», «💬 Эхо — утасны оператор: үнийг хараахан зарлаагүй»
- Shared KB line: «Ажилтан бүрийн гарчигт ИДЭВХТЭЙ эсвэл УДАХГҮЙ гэж бичсэн. УДАХГҮЙ ажилтныг ажиллаж байна гэж хэлэхгүй: урьдчилан бүртгэл авч байна гэж хэлнэ.»
