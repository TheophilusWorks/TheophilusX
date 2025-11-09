import express from "express"
import { PrettyLogger as log, LogTag } from "./utils/PrettyLogger"

const app = express()
const PORT = process.env.PORT || 8080

app.get("/", (req, res)=>{
  res.send("Bot is online")
})

export default ()=>{
  app.listen(PORT, ()=>{
    log.success({
      message: `Web is running on PORT: ${PORT}`,
      tag: LogTag.WEB
    })
  })
}
