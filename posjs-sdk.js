/**
 * Config opts to initialize onsite js sdk
 * @type {{writeKey: string, HOST: string, jsPathfora: string, source: string, stylePathfora: string, channelBroadcastName: string, SSL: string, POWEHI_URL: string, storageKey: string}}
 */
const onsiteOpts = {
  HOST_ENV: "http://localhost:3000/ec.js",
  source: "JS-1mP9MkyemIvMFLOSWe2sR8Ljpaz",
  POWEHI_URL: "https://powehi-stag.primedata.ai",
  writeKey: "1mP9MhJE0DjtR8AZa5j5hEipAE5"
};


let posjs = {};
let worker = null;
let timeoutWorker = null;
let webSocketState = WebSocket.CONNECTING;

posjs.isValidUrlSW =  function(string){
  if(!string) return false;
  if(string === "undefined") return false;
  if(string === "null") return false;
  if(string === "") return false;
  if(!string.includes("http")) return false;
  
  return true;
}

posjs.loadWorkerStatic = function(config, authDataObject) {
  
  // fetch("posjs-worker.js")
  fetch(config.WORKER_URL)
  .then(response => response.blob())
  .then(script => {
    let url = URL.createObjectURL(script);
    
    const storageUrl = localStorage.getItem(config.storageWorkerUrlKey);

    if (!posjs.isValidUrlSW(storageUrl)) {
      localStorage.setItem(config.storageWorkerUrlKey, url);
    }
    
    // let workerStatic = new SharedWorker(url, "abcxyz");
    let workerStatic = new SharedWorker(posjs.isValidUrlSW(storageUrl) ? storageUrl : url, "dom-posjs");
    
    const id = posjs.uuidByte();
    
    console.log("Initializing the web worker for user: " + id);
    workerStatic.port.start();
    
    console.log("Authenticated with data :", authDataObject);
    workerStatic.port.postMessage({
      from: id,
      data: { config, storage: authDataObject },
      type: "init"
    });
    
    
    timeoutWorker = setTimeout(()=>{
      localStorage.removeItem(config.storageWorkerUrlKey);
      posjs.loadWorkerStatic(config, authDataObject)
    }, 1000)
    
    worker = workerStatic;
  
    posjs.workerListener(workerStatic);
    return workerStatic;
  });
};

/**
 * uuid
 * @returns {string}
 */
posjs.uuidByte = function() {
  let firstPart = (Math.random() * 46656) | 0;
  let secondPart = (Math.random() * 46656) | 0;
  firstPart = ("000" + firstPart.toString(36)).slice(-3);
  secondPart = ("000" + secondPart.toString(36)).slice(-3);
  return firstPart + secondPart;
};

/**
 *
 * @param path
 * @param fn
 * @param scope
 * @returns {HTMLLinkElement}
 */
posjs.loadStyle = function(path, fn, scope) {
  let head = document.getElementsByTagName("head")[0]
  let link = document.createElement("link");
  link.setAttribute("href", path);
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");
  
  let sheet, cssRules;
  
  
  if ("sheet" in link) {
    sheet = "sheet";
    cssRules = "cssRules";
  } else {
    sheet = "styleSheet";
    cssRules = "rules";
  }
  
  let interval_id = setInterval(function() {
      try {
        if (link[sheet] && link[sheet][cssRules].length) {
          clearInterval(interval_id);
          clearTimeout(timeout_id);
          fn && fn.call(scope || window, true, link);
        }
      } catch (e) {
      } finally {
      }
    }, 10),
    timeout_id = setTimeout(function() {
      clearInterval(interval_id);
      clearTimeout(timeout_id);
      head.removeChild(link);
      fn && fn.call(scope || window, false, link);
    }, 15000);
  
  head.appendChild(link);
  return link;
};


/**
 * Check condition and load firebase script
 * @param src
 * @param cb
 */
posjs.loadScript = function(src, cb) {
  let newScript = document.createElement("script");
  newScript.type = "text/javascript";
  newScript.setAttribute("async", "true");
  newScript.setAttribute("src", src);
  
  if (newScript.readyState) {
    newScript.onreadystatechange = function() {
      if (cb && /loaded|complete/.test(newScript.readyState)) cb();
    };
  } else {
    cb && newScript.addEventListener("load", cb, false);
  }
  
  document.documentElement.firstChild.appendChild(newScript);
};

/**
 *
 * @param data
 */
posjs.showPopupOnSite = function(data) {
  console.log("showPopupOnSite", data)
  let modal = new pathfora.Form({
    id: posjs.uuidByte(),
    layout: "modal",
    msg: "Welcome to our website",
    variant: 2,
    image: "https://lytics.github.io/pathforadocs/assets/lion.jpg",
    headline: "Headline"
  });
  window.pathfora.initializeWidgets([modal]);
};


posjs.loadConfigPathfora = function(config) {
  posjs.loadStyle(config.stylePathfora);
  posjs.loadScript(config.jsPathfora, null);
};


if (!!window) {
  posjs.loadScript(onsiteOpts.HOST_ENV, () => {
    const configEnv = window.ec;
    onsiteOpts.SSL = configEnv.REACT_APP_WS_SSL;
    onsiteOpts.HOST = configEnv.REACT_APP_WS_URL;
    onsiteOpts.WORKER_URL = configEnv.REACT_APP_WS_WORKER_URL;
    onsiteOpts.stylePathfora = configEnv.REACT_APP_WS_PATHFORA_STYLE_URL;
    onsiteOpts.jsPathfora = configEnv.REACT_APP_WS_PATHFORA_SCRIPT_URL;
    onsiteOpts.storageKey = configEnv.REACT_APP_WS_STORAGE_KEY;
    onsiteOpts.storageWorkerUrlKey = configEnv.REACT_APP_WS_URL_WORKER_STORAGE_KEY;
    onsiteOpts.channelBroadcastName = configEnv.REACT_APP_WS_BROADCAST_CHANNEL_NAME;
    
    
    /**
     *
     * @param config
     */
    posjs.initContext = function(config) {
      let opts = {
        scope: config.source,
        url: config.POWEHI_URL,
        writeKey: config.writeKey,
        initialPageProperties: {
          pageInfo: {
            destinationURL: window.location.href
          }
        }
      };
      !function() {
        var follower = window.follower = window.follower || [];
        if (!follower.initialize) if (follower.invoked) window.console && console.error && console.error("PrimeDATA snippet included twice."); else {
          follower.invoked = !0;
          follower.methods = ["trackSubmit", "trackClick", "trackLink", "trackForm", "pageview", "personalize", "identify", "initialize", "reset", "group", "track", "ready", "alias", "debug", "page", "once", "off", "on", "addSourceMiddleware", "addIntegrationMiddleware", "setAnonymousId", "addDestinationMiddleware"];
          follower.factory = function(t) {
            return function() {
              var e = Array.prototype.slice.call(arguments);
              e.unshift(t);
              follower.push(e);
              return follower;
            };
          };
          for (var t = 0; t < follower.methods.length; t++) {
            var e = follower.methods[t];
            follower[e] = follower.factory(e);
          }
          follower.load = function(t, e) {
            var n = document.createElement("script");
            n.type = "text/javascript";
            n.async = !0;
            n.src = config.POWEHI_URL + "/mining.js";
            var a = document.getElementsByTagName("script")[0];
            a.parentNode.insertBefore(n, a);
            follower._loadOptions = e;
          };
          follower.SNIPPET_VERSION = "0.1.0";
          follower.load();
          follower.initialize({ "Prime Data": opts });
        }
      }();
      
      posjs.interceptNetworkRequests({ onSend: (xhr, args) => posjs.catchupProfile(xhr, args, config) });
    };
    
    /**
     *
     * @param ee
     * {
     *   onFetch: console.log,
     *   onFetchResponse: console.log,
     *   onFetchLoad: console.log,
     *   onOpen: console.log,
     *   onSend: console.log
     *   onError: console.log,
     *   onLoad: console.log
     * }
     * @returns {*}
     */
    posjs.interceptNetworkRequests = function(ee) {
      const open = XMLHttpRequest.prototype.open;
      const send = XMLHttpRequest.prototype.send;
      
      const isRegularXHR = open.toString().indexOf("native code") !== -1;
      
      if (isRegularXHR) {
        XMLHttpRequest.prototype.open = function() {
          ee.onOpen && ee.onOpen(this, arguments);
          if (ee.onLoad) {
            this.addEventListener("load", ee.onLoad.bind(ee));
          }
          if (ee.onError) {
            this.addEventListener("error", ee.onError.bind(ee));
          }
          return open.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.send = function() {
          ee.onSend && ee.onSend(this, arguments);
          return send.apply(this, arguments);
        };
      }
      
      return ee;
    };
    
    /**
     *
     * @param xhr
     * @param bodyRequest
     * @param config
     * @returns {Promise<void>}
     */
    posjs.catchupProfile = async function(xhr, bodyRequest, config) {
      let repeatedInterval = setInterval(function() {
        let status = xhr.status;
        let isContextResponse = xhr.responseURL.includes("/context");
        
        if (status === 200 && isContextResponse) {
          const response = JSON.parse(xhr.response) || xhr.response;
          posjs.prepareDataToInitSocket({
            profileId: response.profileId,
            sessionId: response.sessionId
          }, config);
          clearInterval(repeatedInterval);
        }
      }, 100);
    };
    
    /**
     *
     * @param profile
     * @param config
     */
    posjs.prepareDataToInitSocket = function(profile, config) {
      const SEPARATOR = "___";
      let client_id = profile.profileId + SEPARATOR + profile.sessionId + SEPARATOR + posjs.uuidByte();
      
      const headers = {
        x_client_id: config.source,
        x_client_access_token: config.writeKey
      };
      
      posjs.loadConfigPathfora(config);
      localStorage.setItem(config.storageKey, JSON.stringify({ ...headers, client_id }));
    };
    
    posjs.initConnectionBySW = function(config) {
      const storageString = localStorage.getItem(config.storageKey);
      const authDataObject = JSON.parse(storageString);
      const isAuthenticated = authDataObject && authDataObject.client_id && authDataObject.x_client_access_token && authDataObject.x_client_id;
      !isAuthenticated && posjs.initContext(config);
      
      if (isAuthenticated) {
        posjs.loadConfigPathfora(config);
      }
      
      worker = !worker && posjs.loadWorkerStatic(config, authDataObject);
      
    };
    
    posjs.initConnectionBySW(onsiteOpts);
   
  
    posjs.broadcastChannelListener();
  });
}

// Listen to broadcasts from server
posjs.handleBroadcast = function(data) {
  posjs.showPopupOnSite(data);
};

posjs.handleMessageFromPort = function(data, id) {
  console.log("This message is meant only for user with id: " + id);
  console.log(data);
};

// Use this method to send data to the server.
posjs.postMessageToWSServer = function(input, id) {
  if (webSocketState === WebSocket.CONNECTING) {
    console.log("Still connecting to the server, try again later!");
  } else if (
    webSocketState === WebSocket.CLOSING ||
    webSocketState === WebSocket.CLOSED
  ) {
    console.log("Connection Closed!");
  } else {
    worker.port.postMessage({
      // Include the sender information as a uuid to get back the response5
      from: id,
      data: input
    });
  }
};

posjs.workerListener = function(workerStatic) {
  
  if (workerStatic) {
    workerStatic.port.onmessage = event => {
      switch (event.data.type) {
        case "WSState":
          webSocketState = event.data.state;
          break;
        case "message":
          posjs.handleMessageFromPort(event.data, id);
          break;
        
        case "check_live":
          clearTimeout(timeoutWorker)
          break;
        
        default:
          break;
      }
    };
  }
};


posjs.broadcastChannelListener = function() {
  
  const broadcastChannel = new BroadcastChannel(onsiteOpts.channelBroadcastName);
  broadcastChannel.addEventListener("message", event => {
    switch (event.data.type) {
      case "WSState":
        webSocketState = event.data.state;
        break;
      case "message":
        posjs.handleBroadcast(event.data);
        break;
      
      default:
        break;
    }
  });
};
