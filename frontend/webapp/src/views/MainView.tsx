import {
  MainButton,
  useHapticFeedback,
  useInitData,
  useScanQrPopup,
  useShowPopup
} from "@vkruglikov/react-telegram-web-app";
import axios from "axios";

const MainView = () => {
  const [showQrPopup, closeQrPopup] = useScanQrPopup()
  const [impactOccurred, notificationOccurred,] = useHapticFeedback();
  const showPopup = useShowPopup()
  const [, safeData] = useInitData()

  const handleAuth = (connectionID: string, safeDataString: string | undefined) => {
    axios.post("../auth/login/telegram", {
      connectionId: connectionID,
      telegramAuth: safeDataString,
    })
      .then(() => {
        notificationOccurred("success")
      })
      .catch(() => {
        impactOccurred("heavy")

        showPopup({
          message: "Во время авторизации произошла ошибка",
          buttons: [
            {
              id: "repeat",
              text: "Повторить"
            }
          ]
        }).then(() => {
            showQrPopup({
              text: "Отсканируйте QR-код на сайте"
            }, (text) => {
              handleAuth(text, safeDataString)
            })
        })
      })
  }

  if (safeData === undefined) return (
    <>
    <h1>Откройте сайт через Telegram</h1>
    </>
  )

  return (
    <>
      <h1>Авторизуйтесь на сайте</h1>
      <MainButton onClick={() => showQrPopup({
        text: "Отсканируйте QR-код на сайте"
      }, (connectionID) => {
        closeQrPopup()
        handleAuth(connectionID, safeData)
      })} text="Авторизоваться на сайте"/>
    </>
  )
}

export default MainView
