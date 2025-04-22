export default function Home() {
  return (
    // Main Background
    <main className="flex flex-col h-screen w-screen">
      {/* Header Bar */}
      <div className="flex flex-row w-full h-[18%] md:h-[20%] lg:h-[20%] items-center justify-center bg-white"></div>

      {/* background gifs */}
      <div className="flex flex-row w-full h-full items-center justify-center">
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            backgroundImage: "url('/res/storm.gif')",
            backgroundSize: "contain",
            backgroundRepeat: "repeat",
            backgroundPosition: "center",
          }}
        ></div>
        {/* <div
          className="flex h-full w-full items-center justify-center"
          style={{
            backgroundImage: "url('/res/storm.gif')",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        ></div> */}
      </div>
    </main>
    // <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
    //   <h1 className="text-2xl font-bold">Weather App</h1>
    //   <div className="flex flex-col gap-4 text-center sm:text-left">
    //     <div className="text-lg">
    //       <strong>Temperature:</strong> <span>25°C</span>
    //     </div>
    //     <div className="text-lg">
    //       <strong>Pressure:</strong> <span>1013 hPa</span>
    //     </div>
    //     <div className="text-lg">
    //       <strong>Actively Raining:</strong> <span>No</span>
    //     </div>
    //   </div>
    // </div>
  );
}
