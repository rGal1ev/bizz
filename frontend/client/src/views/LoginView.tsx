import {Button} from "@/components/ui/button.tsx";
import {Loader} from "react-feather";
import {animated, useTransition} from "@react-spring/web";
import {QRCode} from "react-qrcode-logo";
import {useEffect, useState} from "react";
import {z} from "zod";
import useWebSocket from "react-use-websocket";
import {ConnectionMessage, StringPayload} from "@/types/socket.ts";
import {WS_URL} from "@/config.ts";
import {useNavigate} from "react-router-dom";
import {AxiosError, AxiosResponse} from "axios";
import {TokenResponse} from "@/types/auth.ts";
import {TokenPayload} from "@/types/payloads.ts";
import {Logo, TelegramLogo} from "@/assets/icons";
import {toast} from "sonner";
import {loginUser} from "@/api/auth.ts";
import LoginForm from "@/components/forms/auth/LoginForm.tsx";
import {loginSchema} from "@/components/forms/auth/schema.ts";

const LoginView = () => {
  const [isLoading, setLoading] = useState<boolean>(false)
  const [isCodeShowed, setCodeShowed] = useState<boolean>(false)

  const navigate = useNavigate()
  const [connectionID, setConnectionID] = useState<string>("")
  const {lastJsonMessage: message, sendJsonMessage} = useWebSocket<ConnectionMessage>(
    WS_URL,
    {
      share: true,
      onError: () => {
        setConnectionID("")
      },

      onClose: () => {
        setConnectionID("")
      },

      onOpen: () => {
        sendJsonMessage({
          "event": "AUTH_VIA_TELEGRAM",
          "payload": null
        })
      },

      shouldReconnect: () => true
    }
  )

  const transition = useTransition(isCodeShowed, {
    from: {
      margin: "0px 0px",
      width: "0px",
      transform: "scale(0.3)",
      opacity: 0
    },
    enter: {
      margin: "0px 20px",
      width: "320px",
      transform: "scale(1.0)",
      opacity: 1
    },
    leave: {
      width: "0px",
      margin: "0px 0px",
      transform: "scale(0.3)",
      opacity: 0
    }
  })

  const onSuccessLogin = (res: AxiosResponse<TokenResponse>) => {
    localStorage.setItem("accessToken", res.data.accessToken)
    localStorage.setItem("refreshToken", res.data.refreshToken)

    sendJsonMessage({
      event: "SUBSCRIBE_USER",
      payload: {
        data: res.data.accessToken
      }
    })

    navigate("/list", {
      replace: true
    })
  }

  const onErrorLogin = (error: AxiosError) => {
    switch (error.code) {
      case "ERR_BAD_REQUEST":
        toast.warning("Неправильный логин или пароль", {
          classNames: {
            toast: "w-fit"
          }
        })
        break

      case "ERR_NETWORK":
        toast.error("Сервер не отвечает")
        break
    }
  }

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    setLoading(true)

    loginUser({
      username: values.username,
      password: values.password
    })
      .then(res => onSuccessLogin(res))
      .catch(error => onErrorLogin(error))
      .finally(() => setLoading(false))
  }

  const handleLoginViaTelegram = async () => {
    if (isCodeShowed) {
      setCodeShowed(false)
      return
    }

    setCodeShowed(true)
  }

  useEffect(() => {
    if (message === null || message === undefined) return

    switch (message.event) {
      case "TELEGRAM_QR_CODE_ACCESS":
        setConnectionID((message.payload as StringPayload).data)
        break

      case "ACCESS_TOKEN_ACCEPT":
        setLoading(true)
        setCodeShowed(false)
        toast.success("Выполнен вход через Telegram")

        localStorage.setItem("accessToken", (message.payload as TokenPayload).data.accessToken)
        localStorage.setItem("refreshToken", (message.payload as TokenPayload).data.refreshToken)

        sendJsonMessage({
          event: "SUBSCRIBE_USER",
          payload: {
            data: (message.payload as TokenPayload).data.accessToken
          }
        })

        setTimeout(() => {
          navigate("/list")
        }, 1000)

        break
    }

  }, [message, sendJsonMessage]);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken")
    if (accessToken !== null) navigate("/")

    sendJsonMessage({
      "event": "AUTH_VIA_TELEGRAM",
      "payload": null
    })
  }, []);

  return (
    <div className="flex items-center relative justify-center w-full h-screen">
      <div className="absolute top-5 left-5">
        <Logo className="w-14 h-14" />
      </div>
      <div className="w-96">
        <LoginForm
          onSubmit={(data) => onSubmit(data)}
          isLoading={isLoading}
          isCodeShowed={isCodeShowed} />

        <Button
          disabled={isLoading}
          onClick={() => handleLoginViaTelegram()}
          className="w-full mt-2 bg-blue-500 text-white hover:bg-blue-600"
        >
          <TelegramLogo className="mr-2"/> Войти через Telegram
        </Button>
        <Button
          onClick={() => navigate("/signup")}
          variant="link"
          className="w-full mt-2"
        >
          Зарегистрироваться
        </Button>
      </div>

      {transition((style, item) =>
          item && <animated.div style={style} className="w-80 relative">
                  <div className="overflow-hidden w-80">
                      <div className="mb-4">
                          <h2 className="font-bold text-lg">Отсканируйте QR-код</h2>
                          <p className="text-muted-foreground text-sm">Откройте @bizz_bot в Telegram для сканирования
                              кода для
                              сканирования кода
                          </p>
                      </div>

                      <div className="overflow-clip rounded-2xl inline-block mt-3">
                        {connectionID !== "" && <QRCode size={250} eyeRadius={5} value={connectionID}/>}
                        {connectionID === "" &&
                          <div className="w-[270px] h-[270px] bg-white text-black flex justify-center items-center"><Loader
                                className="animate-spin"/></div>}
                      </div>
                  </div>
              </animated.div>
      )}
    </div>
  )
}

export default LoginView