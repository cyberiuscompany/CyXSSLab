// app.js — 20 casos XSS, explicaciones (llano + técnico), control de errores
document.addEventListener('DOMContentLoaded', () => {
  try {
    // DOM elements
    const boxes = Array.from(document.querySelectorAll('.box'));
    const payload = document.getElementById('payload');
    const run = document.getElementById('run');
    const fill = document.getElementById('fill');
    const reset = document.getElementById('reset');
    const result = document.getElementById('result');
    const safe = document.getElementById('safe');
    const sel = document.getElementById('sel');

    const infoTitle = document.getElementById('info-title');
    const infoSimple = document.getElementById('info-simple');
    const infoTech = document.getElementById('info-tech');
    const infoContext = document.getElementById('info-context');
    const infoEx = document.getElementById('info-ex');
    const infoRem = document.getElementById('info-rem');

    if (!boxes.length || !payload || !run || !result || !safe) {
      console.error('Faltan elementos obligatorios en el DOM.');
      if (result) result.textContent = 'Error: elementos del DOM faltantes.';
      return;
    }

    // 20 sinks: id, title, simple, technical, context, payload, mitigation
    const sinks = [
      { id:1, title:'innerHTML', simple:'Insertar HTML del usuario sin limpiar. Ejecución si contiene scripts.', technical:'Uso directo de element.innerHTML con datos no confiables (DOM XSS).', context:'Comentarios con HTML permitido, Formularios de comentarios (formulario), Foros que permiten negrita o links (foro), Cajas de descripción en perfiles (perfil).', payload:"<img src=x onerror=alert('XSS-innerHTML')>", mitigation:'Usar textContent/escape/CSP.' },
      { id:2, title:'location.hash', simple:'Se muestra lo que hay después del # de la URL sin limpiar.', technical:'reflejo de location.hash en el DOM sin escape (DOM XSS).', context:'SPAs que cambian contenido según hash (SPA), Resultados filtrados por hash (resultados), Tablas dinámicas que leen hash (tablas).', payload:"<script>alert('hash-xss')</script>", mitigation:'No insertar hash directamente; escapar/encodear.' },
      { id:3, title:'document.write', simple:'Se escribe HTML con document.write usando datos externos.', technical:'document.write inserta HTML en el flujo; entrada no confiable produce XSS.', context:'Snippets antiguos en páginas educativas (snippet), Widgets de terceros que usan document.write (widget), Publicidad que inyecta HTML directamente (ads).', payload:"<h1>Injected</h1><script>alert('docwrite')</script>", mitigation:'Evitar document.write; usar templating seguro.' },
      { id:4, title:'eval()', simple:'Ejecutar texto como código — si viene del usuario, permite ejecutar cualquier cosa.', technical:'eval ejecuta cadenas JS; entrada maliciosa => ejecución arbitraria.', context:'Calculadoras online que evalúan expresiones (calculadora), Consolas de prueba en páginas educativas (consola), Scripts de test de fórmulas matemáticas (scripts).', payload:"alert('eval-xss')", mitigation:'No usar eval con entrada de usuario.' },
      { id:5, title:'img onerror', simple:'Atributos onerror/onload creados desde input permiten ejecutar JS cuando la imagen falla.', technical:'Event handlers inline creados dinámicamente (atributos) ejecutan código.', context:'Foros que permiten subir imágenes (foro), Blogs que muestran avatares (blog), Sistemas de comentarios que permiten <img> (comentarios).', payload:"<img src=x onerror=alert('XSS-img')>", mitigation:'No permitir atributos de evento; sanitizar.' },
      { id:6, title:'iframe.srcdoc', simple:'Cargar HTML del usuario en srcdoc del iframe; scripts pueden ejecutarse dentro del iframe.', technical:'srcdoc carga HTML arbitrario; scripts ejecutables según sandbox.', context:'Previsualizadores de HTML (editor), Editores online de email o web (editor), Sandboxes de práctica de código (sandbox).', payload:"<p>iframe demo</p><script>console.log('ifr')</script>", mitigation:'Sandboxear iframes o limpiar HTML.' },
      { id:7, title:'insertAdjacentHTML', simple:'Inserta HTML en posiciones concretas sin escape.', technical:'insertAdjacentHTML añade contenido raw; con entrada no confiable produce XSS.', context:'Menús desplegables dinámicos (menu), Tooltips con contenido generado (tooltip), Tabs dinámicas en páginas educativas (tabs).', payload:"<div onclick=alert('adj')>Click</div>", mitigation:'Crear elementos con createElement/textContent o sanitizar.' },
      { id:8, title:'onclick attribute', simple:'Asignar onclick desde input: cuando se haga click, se ejecuta el código.', technical:'Atributos de evento inline con contenido del usuario crean handlers ejecutables.', context:'Botones generados desde contenido del usuario (botón), Juegos o quizzes online que generan botones (quiz), Links que se crean con JS dinámicamente (link).', payload:"alert('onclick-injected')", mitigation:'Usar addEventListener con funciones seguras.' },
      { id:9, title:'query param (?q=) reflected', simple:'El sitio muestra ?q= sin limpiarlo; un enlace con payload ejecuta código.', technical:'Parámetro de consulta reflejado sin escape (reflected XSS).', context:'Buscadores que muestran el término buscado (buscador), Páginas de error que muestran el input del usuario (error), Páginas de filtros con parámetros en URL (filtro).', payload:'"><img src=x onerror=alert("reflected")>', mitigation:'Escapar/validar parámetros en servidor y cliente.' },
      { id:10, title:'script tag innerHTML', simple:'Se construye una etiqueta <script> con texto del usuario y se inserta.', technical:'Insertar <script> desde datos permite ejecución directa del código.', context:'Temas o plantillas que permiten scripts (template), Editores que generan HTML con scripts (editor), Widgets que permiten contenido dinámico (widget).', payload:"console.log('script-injected')", mitigation:'No construir script tags con entrada del usuario.' },

      // nuevos 10
      { id:11, title:'Stored XSS (simulado)', simple:'Contenido malicioso guardado en el servidor aparece después en otras páginas.', technical:'Entrada guardada en base de datos y desplegada sin escape (stored XSS).', context:'Comentarios guardados que se muestran en otros usuarios (comentario), Perfiles con bio editable que permite HTML (perfil), Posts en foros que almacenan contenido HTML (foro).', payload:"<img src=x onerror=alert('stored')>", mitigation:'Escapar al renderizar; filtrar y usar CSP.' },
      { id:12, title:'SVG onload/onfocus', simple:'SVG con onload ejecuta JS cuando se carga/interactúa.', technical:'SVG puede contener handlers (onload) o etiquetas <script>; si se inserta, ejecuta JS.', context:'SVG subidos por usuarios (upload), Iconos animados en perfiles (perfil), Archivos SVG de plantillas compartidas (plantilla).', payload:'<svg onload=alert("svg")></svg>', mitigation:'Rechazar/limitar uploads SVG o sanitizar contenido.' },
      { id:13, title:'javascript: href', simple:'Un link con href="javascript:..." ejecuta código al clicar.', technical:'javascript: URLs ejecutan código en el contexto de la página al activarse.', context:'Links generados desde input del usuario (link), Redirecciones personalizadas (redirect), Botones de navegación dinámica (botón).', payload:'javascript:alert("js-href")', mitigation:'Bloquear javascript: en href; validar enlaces.' },
      { id:14, title:'data: URI (img)', simple:'Una image con src="data:" puede contener HTML/JS en ciertos contextos.', technical:'data: URIs con HTML o SVG pueden incluir scripts si se renderizan como HTML/SVG.', context:'Imágenes subidas con data URI (imagen), Avatares en base64 (perfil), Contenido inline en emails (email).', payload:'data:text/html;base64,PHNjcmlw... (demo)', mitigation:'Rechazar data: o validar tipos MIME; sanitizar.' },
      { id:15, title:'template.innerHTML (templating)', simple:'Plantillas que usan innerHTML con valores sin escapar permiten XSS.', technical:'Rellenar templates con innerHTML o backticks sin escape introduce HTML ejecutable.', context:'Plantillas HTML con datos del usuario (template), Correos generados dinámicamente (email), Dashboards internos con widgets dinámicos (dashboard).', payload:"<b>user</b><script>alert('templ')</script>", mitigation:'Usar templating seguro que escape por defecto.' },
      { id:16, title:'JSONP / callback script', simple:'Scripts remotos que llaman a una función de callback con datos no confiables pueden inyectar código.', technical:'JSONP devuelve código ejecutable (callback(...)); si el contenido no es controlado, XSS puede ocurrir.', context:'APIs antiguas con JSONP (API), Widgets que cargan datos con callback (widget), Scripts remotos para cargar feeds (feed).', payload:'callback( (function(){alert("jsonp")})() )', mitigation:'Evitar JSONP; usar CORS y responses JSON. ' },
      { id:17, title:'postMessage reflection', simple:'Mensajes postMessage que se reflejan en la página sin comprobar origen pueden ejecutar código.', technical:'Si se toma data de postMessage y se inserta en innerHTML sin comprobar origin, riesgo de XSS/DOM.', context:'Iframes que reciben mensajes de otros dominios (iframe), Embeds de contenido externo (embed), Ventanas pop-up que reciben datos (popup).', payload:"<img src=x onerror=alert('postmsg')>", mitigation:'Comprobar event.origin y escapar la data antes de insertarla.' },
      { id:18, title:'style attribute injection', simple:'Inyectar style="..." o <style> con contenido malicioso puede realizar exfiltración o efectos no deseados.', technical:'Aunque CSS no ejecuta JS directamente, ciertas técnicas pueden usarse para robar info o alterar UI; en combinación con attributes/event handlers es peligroso.', context:'Edición WYSIWYG con estilos inline (editor), Temas con colores personalizados (tema), Comentarios con formato avanzado (comentario).', payload:'<div style="background:url(javascript:alert(1))">', mitigation:'Prohibir estilos inline o sanitizar valores CSS.' },
      { id:19, title:'Mutation-based insertion', simple:'Código que aplica mutations al DOM con datos del usuario puede introducir elementos ejecutables.', technical:'Uso de MutationObserver/DOMParser con entrada no validada puede insertar HTML/JS.', context:'Librerías que manipulan DOM dinámico (librería), Reconcilers de frameworks JS (framework), Parsers que crean contenido dinámico (parser).', payload:"<div><img src=x onerror=alert('mutation')></div>", mitigation:'Sanitizar antes de parsear; no usar innerHTML en parsers.' },
      { id:20, title:'CSP bypass demo (unsafe-inline)', simple:'Si la página permite unsafe-inline en CSP, los ataques inline son más fáciles.', technical:'CSP mal configurada (unsafe-inline) no protege contra inyección inline; combinada con otras fallas permite XSS.', context:'Proyectos con CSP débil o heredada (web), Páginas que permiten inline scripts (web), Dashboards antiguos con unsafe-inline (dashboard).', payload:"<script>alert('csp-bypass')</script>", mitigation:'Configurar CSP sin unsafe-inline; usar hashes/nonces para scripts autorizados.' }
    ];

    let choice = 1;

    // set info panel
    function setInfo(id) {
      const s = sinks.find(x => x.id === Number(id));
      if (!s) return;
      if (infoTitle) infoTitle.textContent = s.title;
      if (infoSimple) infoSimple.innerHTML = '<strong>Esplicación Sencilla:</strong> ' + s.simple;
      if (infoTech) infoTech.innerHTML = '<strong>Esplicación Técnica:</strong> ' + s.technical;
      if (infoContext) infoContext.textContent = s.context;
      if (infoEx) infoEx.textContent = s.payload;
      if (infoRem) infoRem.textContent = s.mitigation;
    }

    // visual active + info
    function setActive(id) {
      const n = Number(id) || 1;
      boxes.forEach(b => b.classList.toggle('active', Number(b.dataset.id) === n));
      choice = n;
      if (sel) sel.textContent = 'Caso: ' + choice;
      setInfo(choice);
    }

    // attach listeners
    boxes.forEach(b => {
      b.addEventListener('click', () => {
        try { setActive(b.dataset.id); }
        catch (e) { console.error('setActive error', e); }
      });
    });

    // inicial
    setActive(1);

    // fill example
    if (fill) fill.addEventListener('click', () => {
      try {
        const s = sinks.find(x => x.id === choice);
        if (s) payload.value = s.payload;
      } catch (e) { console.error('fill', e); }
    });

    // reset
    if (reset) reset.addEventListener('click', () => {
      try {
        result.innerHTML = 'Aquí aparecerá la ejecución / simulación';
        safe.textContent = '';
        payload.value = '';
      } catch (e) { console.error('reset', e); }
    });

    // stored-sim DB (memory) for case 11
    const storedDB = [];

    // run handler: muestra/ simula cada caso (con control de errores)
    run.addEventListener('click', () => {
      try {
        const p = payload.value || '';
        safe.textContent = p;
        result.innerHTML = '';

        switch (choice) {
          case 1: { // innerHTML
            const box = document.createElement('div');
            box.innerHTML = '<strong>Demo innerHTML:</strong><div class="demo-out"></div>';
            const target = box.querySelector('.demo-out');
            try { target.innerHTML = p; } catch (e) { target.textContent = 'Error: '+e.message; }
            result.appendChild(box);
            break;
          }
          case 2: { // location.hash
            const box = document.createElement('div');
            box.innerHTML = '<strong>Demo location.hash (simulado):</strong><div class="demo-out"></div>';
            const target = box.querySelector('.demo-out');
            try { target.innerHTML = p; } catch(e){ target.textContent = 'Error: '+e.message; }
            result.appendChild(box);
            break;
          }
          case 3: { // document.write (iframe)
            try {
              const i = document.createElement('iframe');
              i.style.width = '100%'; i.style.height = '220px';
              const doc = i.contentDocument || i.contentWindow.document;
              doc.open(); doc.write(p); doc.close();
              result.appendChild(document.createTextNode('Demo document.write (aislado):'));
              result.appendChild(i);
            } catch(e) { result.appendChild(document.createTextNode('Error document.write: '+e.message)); }
            break;
          }
          case 4: { // eval
            try {
              const out = document.createElement('div'); out.innerHTML = '<strong>Demo eval:</strong>';
              try { const res = (function(){ return eval(p); })(); out.appendChild(document.createTextNode(' Resultado: '+String(res))); }
              catch(e){ out.appendChild(document.createTextNode(' Error en eval: '+e.message)); }
              result.appendChild(out);
            } catch(e){ result.appendChild(document.createTextNode('Error eval: '+e.message)); }
            break;
          }
          case 5: { // img onerror
            const box = document.createElement('div'); box.innerHTML = '<strong>Demo img onerror:</strong>';
            const cont = document.createElement('div');
            try {
              if (/<img\s/i.test(p)) { const frag = document.createElement('div'); frag.innerHTML = p; cont.appendChild(frag); }
              else { const img = document.createElement('img'); img.src='invalid-src'; img.setAttribute('onerror', p); img.style.maxWidth='240px'; cont.appendChild(img); }
            } catch(e){ cont.textContent='Error: '+e.message; }
            box.appendChild(cont); result.appendChild(box);
            break;
          }
          case 6: { // iframe.srcdoc
            try {
              const i = document.createElement('iframe'); i.sandbox=''; i.style.width='100%'; i.style.height='220px'; i.srcdoc = p;
              result.appendChild(document.createTextNode('Demo iframe.srcdoc (sandboxed):')); result.appendChild(i);
            } catch(e){ result.appendChild(document.createTextNode('Error iframe.srcdoc: '+e.message)); }
            break;
          }
          case 7: { // insertAdjacentHTML
            const box = document.createElement('div'); box.innerHTML = '<strong>Demo insertAdjacentHTML:</strong><div class="out"></div>';
            const out = box.querySelector('.out');
            try { out.insertAdjacentHTML('beforeend', p); } catch(e){ out.textContent='Error: '+e.message; }
            result.appendChild(box); break;
          }
          case 8: { // onclick attribute
            const box = document.createElement('div'); box.innerHTML = '<strong>Demo onclick attribute:</strong>';
            const btn = document.createElement('button'); btn.textContent='Pulsar (vulnerable demo)';
            try { btn.setAttribute('onclick', p); } catch(e){ btn.textContent='Error onclick: '+e.message; }
            box.appendChild(btn); result.appendChild(box); break;
          }
          case 9: { // reflected ?q=
            const box = document.createElement('div'); box.innerHTML = '<strong>Demo reflected (?q=):</strong>';
            const out = document.createElement('div'); try{ out.innerHTML = p; } catch(e){ out.textContent='Error: '+e.message; }
            box.appendChild(out); result.appendChild(box); break;
          }
          case 10: { // script tag via innerHTML
            const box = document.createElement('div'); box.innerHTML = '<strong>Demo script tag (innerHTML):</strong><div class="out"></div>';
            const out = box.querySelector('.out');
            try { out.innerHTML = '<script>' + p + '<\/script>'; } catch(e){ out.textContent='Error: '+e.message; }
            result.appendChild(box); break;
          }

          // nuevos 10
          case 11: { // stored XSS (simulado)
            try {
              // guardamos (simulando DB) y mostramos lista
              storedDB.push(p);
              const box = document.createElement('div'); box.innerHTML = '<strong>Demo Stored XSS — almacenado y mostrado:</strong>';
              const list = document.createElement('div');
              storedDB.forEach((item, idx) => {
                const entry = document.createElement('div');
                entry.innerHTML = '<em>Entrada '+(idx+1)+':</em> ' + item; // vulnerable demo: innerHTML
                list.appendChild(entry);
              });
              box.appendChild(list); result.appendChild(box);
            } catch(e){ result.appendChild(document.createTextNode('Error stored: '+e.message)); }
            break;
          }
          case 12: { // SVG onload
            try {
              const box = document.createElement('div'); box.innerHTML = '<strong>Demo SVG onload:</strong>';
              const wrap = document.createElement('div'); try { wrap.innerHTML = p; } catch(e){ wrap.textContent='Error: '+e.message; }
              box.appendChild(wrap); result.appendChild(box);
            } catch(e){ result.appendChild(document.createTextNode('Error svg: '+e.message)); }
            break;
          }
          case 13: { // javascript: href
            try {
              const a = document.createElement('a'); a.textContent = 'Demo link (javascript:)';
              a.href = p; a.target = '_blank';
              result.appendChild(document.createTextNode('Cuidado al clicar el link demo:')); result.appendChild(a);
            } catch(e){ result.appendChild(document.createTextNode('Error js-href: '+e.message)); }
            break;
          }
          case 14: { // data: URI
            try {
              const box = document.createElement('div'); box.innerHTML = '<strong>Demo data: URI (imagen/texto):</strong>';
              const cont = document.createElement('div'); try { cont.innerHTML = p; } catch(e){ cont.textContent='Error: '+e.message; }
              box.appendChild(cont); result.appendChild(box);
            } catch(e){ result.appendChild(document.createTextNode('Error data: '+e.message)); }
            break;
          }
          case 15: { // template.innerHTML
            try {
              const box = document.createElement('div'); box.innerHTML = '<strong>Demo template.innerHTML:</strong>';
              const template = document.createElement('div');
              try { template.innerHTML = p; box.appendChild(template); } catch(e){ template.textContent='Error: '+e.message; box.appendChild(template); }
              result.appendChild(box);
            } catch(e){ result.appendChild(document.createTextNode('Error template: '+e.message)); }
            break;
          }
          case 16: { // JSONP / callback script (simulado)
            try {
              // simulamos cargar un script remoto que invoca una función (dangerous)
              const box = document.createElement('div'); box.innerHTML = '<strong>Demo JSONP (simulado):</strong>';
              const out = document.createElement('div');
              try {
                // ejecutamos p en contexto demo (no es JSONP real, es demostrativo)
                const script = document.createElement('script'); script.textContent = p;
                out.appendChild(document.createTextNode('Se inyectó un <script> demo (ver console)')); out.appendChild(script);
              } catch(e){ out.textContent = 'Error JSONP: '+e.message; }
              box.appendChild(out); result.appendChild(box);
            } catch(e){ result.appendChild(document.createTextNode('Error jsonp: '+e.message)); }
            break;
          }
          case 17: { // postMessage reflection (simulado)
            try {
              const box = document.createElement('div'); box.innerHTML = '<strong>Demo postMessage (simulado):</strong>';
              // simulamos recepción de mensaje y reflejo en innerHTML
              const out = document.createElement('div');
              try { out.innerHTML = p; } catch(e){ out.textContent='Error: '+e.message; }
              box.appendChild(out); result.appendChild(box);
            } catch(e){ result.appendChild(document.createTextNode('Error postMessage: '+e.message)); }
            break;
          }
          case 18: { // style attribute injection
            try {
              const box = document.createElement('div'); box.innerHTML = '<strong>Demo style injection:</strong>';
              const cont = document.createElement('div'); try { cont.innerHTML = p; } catch(e){ cont.textContent='Error: '+e.message; }
              box.appendChild(cont); result.appendChild(box);
            } catch(e){ result.appendChild(document.createTextNode('Error style: '+e.message)); }
            break;
          }
          case 19: { // Mutation-based insertion
            try {
              const box = document.createElement('div'); box.innerHTML = '<strong>Demo Mutation-based insertion:</strong>';
              const container = document.createElement('div'); box.appendChild(container);
              result.appendChild(box);
              // crear mutation que añade node con payload
              const node = document.createElement('div'); try { node.innerHTML = p; } catch(e){ node.textContent='Error: '+e.message; }
              // simular cambio
              container.appendChild(node);
            } catch(e){ result.appendChild(document.createTextNode('Error mutation: '+e.message)); }
            break;
          }
          case 20: { // CSP bypass demo (unsafe-inline)
            try {
              const box = document.createElement('div'); box.innerHTML = '<strong>Demo CSP-unsafe-inline (simulado):</strong>';
              const out = document.createElement('div');
              try { out.innerHTML = p; } catch(e){ out.textContent='Error: '+e.message; }
              box.appendChild(out); result.appendChild(box);
            } catch(e){ result.appendChild(document.createTextNode('Error csp: '+e.message)); }
            break;
          }

          default:
            result.textContent = 'Caso desconocido.';
        }
      } catch (err) {
        console.error('Run error', err);
        result.textContent = 'Error ejecutando demo: ' + (err && err.message ? err.message : String(err));
      }
    });

    // inicial info panel
    setInfo(1);

  } catch (initErr) {
    console.error('Init error', initErr);
    const r = document.getElementById('result');
    if (r) r.textContent = 'Error al iniciar la app: ' + (initErr.message || String(initErr));
  }
});
