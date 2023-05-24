type Req = import("./server").IncomingMessage;

type Res = import("./server").ServerResponse;

type Handler = ((req: Req, res: Res) => void) | ((req: Req, res: Res) => Promise<void>);
