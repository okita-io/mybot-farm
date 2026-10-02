/* Hermes Crew Worlds — dashboard plugin (GAF-aligned).
 *
 * Primary source: the planted GAF worlds on disk, exposed by plugin_api.py
 *   GET /api/plugins/hermes-worlds/worlds
 *   GET /api/plugins/hermes-worlds/worlds/:id
 *   GET /api/plugins/hermes-worlds/worlds/:id/assets/<rel>
 * See the plugin README ("Data contract") and the mybot-farm specs
 * (docs/worlds-exchange-spec.md, docs/worlds-portability-spec.md).
 *
 * Secondary (cosmetic) overlay: activity pulse from the sessions API,
 * scoped to cast profiles only. With rules.turnModel === "defer" the pulse
 * is display-only; Bot Mode owns turns.
 */
(function () {
  "use strict";

  var SDK = window.__HERMES_PLUGIN_SDK__;
  var React = SDK.React;
  var h = React.createElement;
  var useState = SDK.hooks.useState;
  var useEffect = SDK.hooks.useEffect;
  var useMemo = SDK.hooks.useMemo;

  var POLL_MS = 15000;
  var ACTIVE_MS = 5 * 60 * 1000;
  var BUSY_MS = 30 * 60 * 1000;
  var IDLE_MS = 3 * 60 * 60 * 1000;

  var PULSE = {
    working: { label: "working", emoji: "⚡", cls: "hw-p-working" },
    fresh:   { label: "fresh",   emoji: "💬", cls: "hw-p-fresh" },
    idle:    { label: "idle",    emoji: "☕", cls: "hw-p-idle" },
    asleep:  { label: "asleep",  emoji: "😴", cls: "hw-p-asleep" }
  };

  function toMs(ts) {
    return ts && ts < 1e12 ? ts * 1000 : ts;
  }

  function timeAgo(ts, now) {
    var ms = toMs(ts);
    if (!ms) return "never";
    var s = Math.max(0, Math.floor((now - ms) / 1000));
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }

  // ------------------------------------------------------------------
  // Authenticated asset loader
  // ------------------------------------------------------------------
  // The dashboard token-gates every /api/ path, so a plain <img src>/CSS
  // url() 401s even when the file exists. SDK.authedFetch is the blessed
  // channel for blob downloads (auth in both loopback and gated modes).
  // We fetch once per gateway asset URL, hand back an object URL, and cache
  // the promise so polling / world-switching never re-download. A 404 / 401
  // resolves to null → the caller degrades to its placeholder (no page error).
  var _assetCache = {};
  function useAsset(url) {
    var st = useState(null);
    var [objUrl, setObjUrl] = st;
    useEffect(function () {
      if (!url) { setObjUrl(null); return; }
      var entry = _assetCache[url];
      if (!entry) {
        entry = {};
        entry.p = SDK.authedFetch(url)
          .then(function (resp) {
            if (!resp || !resp.ok) return null;
            return resp.blob().then(function (b) { return URL.createObjectURL(b); });
          })
          .catch(function () { return null; })
          .then(function (o) { entry.obj = o || null; return o || null; });
        _assetCache[url] = entry;
      }
      if (entry.obj) setObjUrl(entry.obj);
      else entry.p.then(function (o) { setObjUrl(o || null); });
    }, [url]);
    // Object URLs are shared via the cache and live for the page's lifetime;
    // revoking here would break other consumers of the same asset.
    return objUrl;
  }

  // ------------------------------------------------------------------
  // World data (gateway)
  // ------------------------------------------------------------------
  function useWorlds() {
    var d = useState(null);
    var [data, setData] = d;
    var err = useState(null);
    var [error, setError] = err;
    // Selected world id lives in a ref so the poll (a stable closure) always
    // sees the latest choice instead of the value captured at mount.
    var selRef = SDK.hooks.useRef(null);

    function pickTarget(worlds) {
      var kept = selRef.current;
      for (var i = 0; i < worlds.length; i++) {
        if (worlds[i].id === kept) return kept;
      }
      var fallback = worlds.length ? worlds[0].id : null;
      selRef.current = fallback;
      return fallback;
    }

    function fetchView(id, list) {
      SDK.fetchJSON("/api/plugins/hermes-worlds/worlds/" +
        encodeURIComponent(id)).then(function (view) {
        setData(function (prev) {
          return { id: id, list: list || (prev && prev.list) || [], world: view };
        });
        setError(null);
      }).catch(function (e) {
        setError(String(e && e.message || e));
      });
    }

    useEffect(function () {
      var timer = null;
      var inFlight = false;
      function poll() {
        if (inFlight) return;
        inFlight = true;
        SDK.fetchJSON("/api/plugins/hermes-worlds/worlds").then(function (resp) {
          inFlight = false;
          var worlds = (resp && resp.worlds) || [];
          var target = pickTarget(worlds);
          if (!target) {
            setData({ id: null, list: worlds, world: null });
            setError(null);
            return;
          }
          fetchView(target, worlds);
        }).catch(function (e) {
          inFlight = false;
          setError(String(e && e.message || e));
        });
      }
      poll();
      timer = setInterval(poll, POLL_MS);
      return function () { clearInterval(timer); };
    }, []);

    // Immediate selection on chip click; the next poll keeps this world
    // selected as long as it still exists.
    function select(id) {
      selRef.current = id;
      fetchView(id, data && data.list);
    }

    return { data: data, error: error, select: select };
  }

  // ------------------------------------------------------------------
  // Cast activity pulse (sessions API — cosmetic overlay only)
  // ------------------------------------------------------------------
  function usePulse(cast) {
    var st = useState({});
    var [pulse, setPulse] = st;
    var key = useMemo(function () {
      return cast.map(function (c) { return c.profileName || ""; }).join("|");
    }, [cast]);

    useEffect(function () {
      var timer = null;
      var inFlight = false;
      function poll() {
        if (inFlight) return;
        var names = cast.map(function (c) { return c.profileName; })
          .filter(Boolean);
        if (!names.length) { setPulse({}); return; }
        inFlight = true;
        Promise.all(names.map(function (n) {
          return SDK.fetchJSON("/api/sessions?limit=5&order=recent&profile=" +
            encodeURIComponent(n)).catch(function () { return { sessions: [] }; });
        })).then(function (results) {
          inFlight = false;
          var map = {};
          results.forEach(function (resp, i) {
            var s = (resp && resp.sessions) || [];
            map[names[i]] = s.length ? { latest: s[0] } : {};
          });
          setPulse(map);
        });
      }
      poll();
      timer = setInterval(poll, POLL_MS);
      return function () { clearInterval(timer); };
    }, [key]);
    return pulse;
  }

  // ------------------------------------------------------------------
  // Cast tile (one character) — a component so it can use the useAsset hook
  // ------------------------------------------------------------------
  function CastTile(props) {
    var c = props.c;
    var now = props.now;
    var avatarObj = useAsset(c.avatarUrl);
    var pl = c.profileName ? props.pulse[c.profileName] : null;
    var best = pl && pl.latest;
    var pstate;
    if (!c.profileName) pstate = null;
    else if (!best) pstate = "asleep";
    else {
      var age = now - toMs(best.last_active || 0);
      pstate = (best.is_active || age < ACTIVE_MS) ? "working"
        : (age < BUSY_MS ? "fresh" : (age < IDLE_MS ? "idle" : "asleep"));
    }
    var st = pstate ? PULSE[pstate] : null;
    var name = c.name || c.id;
    var avatar = avatarObj
      ? h("img", { className: "hw-avatar-img", src: avatarObj, alt: name,
          onError: function (e) { e.target.style.display = "none"; } })
      : h("div", { className: "hw-avatar-fallback" }, name.slice(0, 1).toUpperCase());
    var title = [
      name,
      "role: " + c.id,
      c.profileName ? "profile: " + c.profileName : "profile: (not planted)",
      st ? "pulse: " + st.label : "pulse: n/a",
      c.home ? "home: " + c.home : null,
      c.isGreeter ? "greeter" : null
    ].filter(Boolean).join("\n");
    return h("div", { className: "hw-tile" + (st ? " " + st.cls : ""), title: title },
      h("div", { className: "hw-scene" },
        h("div", { className: "hw-avatar" }, avatar),
        st && st.emoji ? h("span", { className: "hw-spark" }, st.emoji) : null,
        c.isGreeter ? h("span", { className: "hw-greeter" }, "★ greeter") : null
      ),
      h("div", { className: "hw-name" }, name),
      h("div", { className: "hw-sub" },
        h("span", { className: "hw-status" }, st ? st.label : "—"),
        h("span", { className: "hw-time" },
          c.profileName && best ? timeAgo(best.last_active, now) : "n/a")
      )
    );
  }

  // ------------------------------------------------------------------
  // Scene view (GAF worlds/v1)
  // ------------------------------------------------------------------
  function SceneCard(props) {
    var view = props.world;
    var now = props.now;
    var cast = view.cast || [];
    var places = view.places || [];
    var state = view.state || {};
    var current = state.place || (view.entrypoint && view.entrypoint.place);

    var cur = places[0];
    for (var i = 0; i < places.length; i++) {
      if (places[i].id === current) { cur = places[i]; break; }
    }

    var castById = {};
    cast.forEach(function (c) { castById[c.id] = c; });

    // Who's on-stage at the current place. state.where (role -> placeId) is
    // the authoritative "who's where now" (from state.json, or the gateway's
    // default derivation). The place's static `present[]` is only a fallback
    // when where[] is empty.
    var where = state.where;
    var haveWhere = where && Object.keys(where).length;
    var onStageRoles = [];
    if (haveWhere) {
      for (var role in where) {
        if (where[role] === cur.id) onStageRoles.push(role);
      }
    } else if (cur) {
      onStageRoles = (cur.present || []).slice();
    }
    var onStage = onStageRoles.map(function (r) { return castById[r]; }).filter(Boolean);
    var offStage = cast.filter(function (c) { return onStage.indexOf(c) === -1; });

    var palette = view.theme && view.theme.palette;
    var hints = view.widgetHints || {};
    // Active-place art + world backdrop are loaded through authedFetch
    // (the dashboard token-gates /api/), not a bare <img src>/CSS url().
    var curPlace = cur || null;
    var placeArtUrl = (curPlace && curPlace.artUrl) || null;
    var placeArtObj = useAsset(placeArtUrl);
    var backdropUrl = (hints.showBackdrop !== false && view.theme && view.theme.backdropUrl)
      ? view.theme.backdropUrl : null;
    var backdropObj = useAsset(backdropUrl);

    var sceneStyle = {
      backgroundColor: (palette && palette.bg) || undefined,
      color: (palette && palette.fg) || undefined
    };
    if (backdropObj) {
      sceneStyle.backgroundImage = "url(" + backdropObj + ")";
      sceneStyle.backgroundSize = "cover";
      sceneStyle.backgroundPosition = "center";
    }
    // World accent drives the active place tab (scoped to the scene card).
    if (palette && palette.accent) sceneStyle["--hw-accent"] = palette.accent;
    // scenePanel === false is advisory too: the pane still renders.

    function tile(c, key) {
      return h(CastTile, { key: key, c: c, now: now, pulse: props.pulse });
    }

    return h("div", { className: "hw-scene-card", style: sceneStyle },
      h("div", { className: "hw-scene-head" },
        h("div", { className: "hw-scene-title" },
          view.title,
          view.theme && view.theme.mood
            ? h("span", { className: "hw-mood" }, " · " + view.theme.mood)
            : null
        ),
        h("div", { className: "hw-place-tabs" },
          places.map(function (pl) {
            return h("button", {
              key: pl.id,
              className: "hw-place-tab" + (pl.id === cur.id ? " active" : ""),
              onClick: function () { props.onPlace(pl.id); }
            }, pl.name || pl.id);
          })
        )
      ),
      placeArtObj
        ? h("img", {
            className: "hw-place-art",
            src: placeArtObj,
            alt: "active place art",
            onError: function (e) { e.target.style.display = "none"; }
          })
        : null,
      h("div", { className: "hw-scene-body" },
        cur
          ? h("div", { className: "hw-stage" },
              h("div", { className: "hw-stage-label" },
                "On the stage — " + (cur.name || cur.id),
                onStage.length === 0
                  ? h("span", { className: "hw-empty" }, " (no one here)")
                  : null),
              onStage.length
                ? h("div", { className: "hw-tiles" }, onStage.map(function (c) { return tile(c, c.id); }))
                : null
            )
          : null,
        offStage.length
          ? h("div", { className: "hw-offstage" },
              h("div", { className: "hw-stage-label" }, "Offstage"),
              h("div", { className: "hw-tiles" }, offStage.map(function (c) { return tile(c, c.id); }))
            )
          : null
      ),
      view.rules && view.rules.turnModel === "defer"
        ? h("div", { className: "hw-note" },
          "turnModel: defer — Bot Mode owns turns in this world; pulse is cosmetic.")
        : null
    );
  }

  // ------------------------------------------------------------------
  // Fleet pulse (pre-GAF fallback — all profiles, session-derived)
  // ------------------------------------------------------------------
  function useFleet(enabled) {
    var st = useState(null);
    var [roster, setRoster] = st;
    useEffect(function () {
      // Fleet pulse is only the empty-state fallback: never hit the network
      // while a GAF scene is on screen.
      if (!enabled) {
        setRoster(null);
        return;
      }
      var timer = null;
      var inFlight = false;
      function poll() {
        if (inFlight) return;
        inFlight = true;
        SDK.fetchJSON("/api/profiles").then(function (profilesResp) {
          var profiles = (profilesResp && profilesResp.profiles) || [];
          if (!profiles.length) { inFlight = false; return; }
          Promise.all(profiles.map(function (p) {
            var name = p.name || p.id || String(p);
            return SDK.fetchJSON("/api/sessions?limit=5&order=recent&profile=" +
              encodeURIComponent(name)).catch(function () { return { sessions: [] }; });
          })).then(function (results) {
            inFlight = false;
            var nowTs = Date.now();
            var rows = results.map(function (resp, i) {
              var pSessions = resp.sessions || [];
              var name = profiles[i].name || profiles[i].id || String(profiles[i]);
              var best = pSessions[0];
              var age = best ? nowTs - toMs(best.last_active || 0) : Infinity;
              var status = best.is_active || age < ACTIVE_MS ? "working"
                : age < BUSY_MS ? "fresh" : age < IDLE_MS ? "idle" : "asleep";
              return {
                name: name,
                status: status,
                lastActive: best ? toMs(best.last_active) : 0,
                sessions: pSessions.length,
                model: best ? (best.model || "—") : "—"
              };
            });
            var rank = { working: 0, fresh: 1, idle: 2, asleep: 3 };
            rows.sort(function (a, b) {
              return rank[a.status] - rank[b.status] ||
                (b.lastActive || 0) - (a.lastActive || 0);
            });
            setRoster(rows);
          });
        }).catch(function () { inFlight = false; });
      }
      poll();
      timer = setInterval(poll, POLL_MS);
      return function () { clearInterval(timer); };
    }, [enabled]);
    return roster;
  }

  function FleetGrid(props) {
    var roster = props.roster;
    var now = props.now;
    if (!roster) return null;
    var counts = { working: 0, fresh: 0, idle: 0, asleep: 0 };
    roster.forEach(function (r) { counts[r.status] += 1; });
    return h("div", null,
      h("div", { className: "hw-stats" },
        h("span", { className: "hw-chip" + (counts.working ? " hw-chip-working" : "") },
          counts.working + " working"),
        h("span", { className: "hw-chip" }, counts.fresh + " fresh"),
        h("span", { className: "hw-chip" }, counts.idle + " idle"),
        h("span", { className: "hw-chip" }, counts.asleep + " asleep")
      ),
      h("div", { className: "hw-world" },
        roster.map(function (r) {
          var st = PULSE[r.status];
          return h("div", { key: r.name, className: "hw-tile " + st.cls,
            title: r.name + "\nlast active: " + timeAgo(r.lastActive, now) +
              "\nsessions: " + r.sessions + "\nmodel: " + r.model },
            h("div", { className: "hw-scene" },
              h("span", { className: "hw-character" }, st.emoji),
              r.status === "asleep" ? h("span", { className: "hw-zzz" }, "z z z") : null,
              r.status === "working" ? h("span", { className: "hw-spark" }, "⚡") : null
            ),
            h("div", { className: "hw-name" }, r.name),
            h("div", { className: "hw-sub" },
              h("span", { className: "hw-status" }, st.label),
              h("span", { className: "hw-time" }, timeAgo(r.lastActive, now))
            )
          );
        })
      )
    );
  }

  // ------------------------------------------------------------------
  // Page
  // ------------------------------------------------------------------
  function CrewWorlds() {
    var worlds = useWorlds();
    var fleet = useFleet(!(worlds.data && worlds.data.world));
    var nowSt = useState(Date.now());
    var now = nowSt[0];
    var setNow = nowSt[1];
    var placeSt = useState(null);
    var viewPlace = placeSt[0];
    var setViewPlace = placeSt[1];
    var worldId = worlds.data && worlds.data.world ? worlds.data.world.id : null;

    useEffect(function () {
      var t = setInterval(function () { setNow(Date.now()); }, 5000);
      return function () { clearInterval(t); };
    }, []);

    // A place tab chosen in world A must not stick when world B loads.
    useEffect(function () { setViewPlace(null); }, [worldId]);

    var cast = worlds.data && worlds.data.world ? (worlds.data.world.cast || []) : [];
    var pulse = usePulse(cast);

    if (worlds.error) {
      return h("div", { className: "hw-root" },
        h("div", { className: "hw-card hw-error" },
          "Crew Worlds: " + worlds.error));
    }

    var world = worlds.data && worlds.data.world;
    var list = (worlds.data && worlds.data.list) || [];

    // Display-only place selection (never writes state.json).
    var scenePlace = viewPlace ||
      (world && world.state && world.state.place) ||
      (world && world.entrypoint && world.entrypoint.place);
    var sceneWorld = world;
    if (world && scenePlace && (!world.state || world.state.place !== scenePlace)) {
      sceneWorld = Object.assign({}, world, {
        state: Object.assign({}, world.state, { place: scenePlace })
      });
    }

    return h("div", { className: "hw-root" },
      h("div", { className: "hw-head" },
        h("div", { className: "hw-title" }, "⚔️ Crew Worlds"),
        h("div", { className: "hw-stats" },
          list.length
            ? list.map(function (w) {
                return h("button", {
                  key: w.id,
                  className: "hw-chip" +
                    (worlds.data && worlds.data.id === w.id ? " hw-chip-working" : ""),
                  onClick: function () { worlds.select(w.id); }
                }, w.title);
              })
            : h("span", { className: "hw-chip hw-chip-muted" }, "no worlds planted"),
          h("span", { className: "hw-chip hw-chip-muted" }, "live " + Math.round(POLL_MS / 1000) + "s")
        )
      ),

      sceneWorld
        ? h(SceneCard, {
            world: sceneWorld,
            now: now,
            pulse: pulse,
            onPlace: setViewPlace
          })
        : h("div", { className: "hw-card hw-empty-card" },
            "No worlds planted yet.",
            h("br"),
            h("span", { className: "text-sm text-muted-foreground" },
              "Plant a world-pack with ",
              h("code", null, "farm_plant"),
              " (mybot-farm) to see a scene here."),
            h("div", { className: "hw-fleet-section" },
              h("div", { className: "hw-title hw-title-small" }, "Fleet pulse (pre-GAF)"),
              h(FleetGrid, { roster: fleet, now: now })
            )
          )
    );
  }

  window.__HERMES_PLUGINS__.register("hermes-worlds", CrewWorlds);
})();
