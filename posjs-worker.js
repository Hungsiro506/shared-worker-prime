const idToPortMap = {};
let wConf = null
let store = null
let bcChannel = null

function initConnectionBySharedWorker(args) {
  
  wConf = args.config;
  store = args.storage;
  const url = wConf.SSL + "://" + wConf.HOST + "/ws/register/" + store.client_id + "/" + store.x_client_id + "/" + store.x_client_access_token;
  
  console.log("Client ID: ", store.client_id);
  
  // Open a connection. This is a common connection. This will be opened only once.
  const ws = new WebSocket(url);
  
  // Create a broadcast channel to notify about state changes
  bcChannel = new BroadcastChannel(wConf.channelBroadcastName);


  // Let all connected contexts(tabs) know about state changes
  ws.onopen = () => bcChannel.postMessage({ type: "WSState", state: ws.readyState });
  ws.onclose = () => bcChannel.postMessage({ type: "WSState", state: ws.readyState });

  // When we receive data from the server.
  ws.onmessage = ({ data }) => {
    
    // Construct object to be passed to handlers
    const parsedData = { data: JSON.parse(data), type: "message" };
    if (!parsedData.data.from) {
      // Broadcast to all contexts(tabs). This is because no particular id was set on the from field here. We're using this field to identify which tab sent the message
      bcChannel.postMessage(parsedData);
    } else {
      // Get the port to post to using the uuid, ie send to expected tab only.
      idToPortMap[parsedData.data.from].postMessage(parsedData);
    }
  };
  
  return ws;
}

// Event handler called when a tab tries to connect to this worker.
onconnect = e => {
  const port = e.ports[0];
  let ws = null;
  port.postMessage({ state: "im live", type: "check_live" });
  port.onmessage = msg => {
    idToPortMap[msg.data.from] = port;
    if (msg.data.type === "init") {
      console.log(msg.data);
      if (!wConf && !store) {
        ws = initConnectionBySharedWorker(msg.data.data);
      } else {
        bcChannel.postMessage("bcChannel New client", port);
        port.postMessage({state: "port New client", type: "check_live"});
      }
    }
  };
  
  // We need this to notify the newly connected context to know the current state of WS connection.
  port.postMessage({ state: ws ? ws.readyState : "NONE", type: "WSState" });
};