EN 稿 A（dev.to / Medium 用）· 第⑦篇英文版 · 2026-10-17
状态：成稿待发。发布通道需 Owner 登录（dev.to / Medium 本会话无登录态），我不代注册。
过闸：tmp/scan-copy-en.mjs（见文末读数）。不写价、不写速度、不写跨平台、不提其他设计套件。

标题：
Write the script yourself or run a delivery tool — what actually differs when you batch-replace text in PSDs

---

TuYi Workshop (tuyigf.com) is a design-delivery tool that batch-writes translations you already have into PSD / PSB text layers. It does not translate. It is not ImageTrans — picture-translation tools read words off a flattened image and redraw them; this writes into the layers of a layered file, and the file stays editable.

Someone always says the same thing in this thread: *"I can do that with a script."* Correct. Photoshop has been scriptable for decades, and the core replacement is a few lines. So let me put those lines up front, then talk about what they don't do.

```jsx
var doc = app.open(new File("D:/design/detail_page.psd"));
var layer = doc.artLayers.getByName("Title-Main");
if (layer.kind === LayerKind.TEXT) {
  layer.textItem.contents = "Añadir al carrito";
}
```

That writes. Whether it wrote *where you meant*, and whether the file you saved is the file you can defend afterwards — those are four different problems, and none of them are about the line above.

## 1. Finding the layer

`getByName` matches exactly one name and returns the first hit. In real artwork from a CJK market, layer names are "Text", "Text copy", "Group 1 copy 2", often buried inside collapsed groups, often duplicated. A script that finds the first layer with the right name will eventually write into the wrong one — the file saves, nothing looks broken on screen, and a client finds it three weeks later.

Position-based or path-based targeting is the fix. The cost of that fix is that you are now maintaining a matcher, not a replacement.

## 2. Characters

Quotation marks, backslashes, line breaks, full-width punctuation, and the invisible ones — zero-width space, non-breaking space, paragraph separators carried over from a spreadsheet. `contents` can end up holding a string one character longer than what you pasted, which looks identical and breaks the next edit. You will find this out when someone says "I can't delete this line".

## 3. The dialog that stops everything

If the target language's font is missing, Photoshop asks a question. A script has no way to answer it, so execution parks on that modal dialog: process alive, nothing happening. Unless you built a timeout and a recovery path, this job needs a human watching a screen.

## 4. Version and property differences

Text properties are not stable across Photoshop versions. Two concrete traps: `textItem.leading` returns a computed value while auto-leading is on, so assigning a fixed leading does nothing until you turn auto-leading off; and `textItem.font` reports a PostScript name, not the label you see in the Character panel, so assigning the visible name results in a substituted face. Both are searchable. Neither is fun at two in the morning with a delivery deadline.

## 5. Proof and recovery

This is the one nobody writes in their script, and it is the one that decides whether the job can be handed to a second person. "No error thrown" and "every layer now holds the right string" are different claims. To back the second one you need to read each layer back and compare it against the table — and decide what happens on a mismatch: continue and leave wrong content in the file, or stop and leave the file untouched.

## Count the actions, not the percentages

I am not going to quote a productivity number; there is no third-party benchmark, and a number I invented would be worth nothing. What you can compute yourself: a detail page with 40 text layers, delivered in 8 languages, is 40 × 8 = **320** passes of "find layer → text tool → select all → copy from the table → paste → check overflow → deselect". Add the window-switching between the spreadsheet and Photoshop. And note the second cost: each of those 320 passes is one place where any of the five problems above can occur without announcing itself.

A batch tool compresses that to: import the table, write and read back per language, and you only look at the positions that need a decision.

## Where TuYi Workshop sits in this

It targets layers by scanned path and per-layer matching rather than by name; before writing, it reconciles the table against the file and stops on one source string mapping to several translations instead of picking for you; after each write it reads the layer back and compares — on a mismatch it fails there and leaves the file unsaved, so no wrong text reaches disk; overflow risk and missing fonts get reported rather than absorbed by shrinking your type; and the output is a report grouped into confirmed / needs review / needs your decision, locatable down to a layer.

Verifiable edges: up to 12 target languages per batch; Windows 10 / 11 (64-bit) with Photoshop installed on that machine; design file bytes stay local while layer text, table strings and path strings go to the server for quoting, binding, dispatch and settlement (scope: https://tuyigf.com/privacy). Private beta, by request at **tuyi@tuyigf.com**. The Windows assistant and its install steps: https://tuyigf.com/en/download (product page: https://tuyigf.com/en). It does not translate, and it does not touch pixels.

## Three things that argue against me

1. If you are doing one or two languages on a small file, write the script or do it by hand. Learning a tool costs more than the job.
2. Flattened type, type inside smart objects, type converted to shape — no method writes into those, ours included. Listing them honestly is the only fair behaviour.
3. We are in private beta. If you have a large print run on a deadline, ask first whether we can take it. That is a real boundary, not modesty.

## If you keep your own script, answer these four

- How do you locate a layer when two share a name?
- After writing, do you read back? If a mismatch shows up, do you restore or continue?
- What happens when Photoshop opens a modal dialog halfway through?
- In three months, can someone else — or you — follow the logic without breaking a delivery?

Two clean answers and you genuinely don't need a tool. Two missing ones, and what you are missing was never the replacement line of code.
