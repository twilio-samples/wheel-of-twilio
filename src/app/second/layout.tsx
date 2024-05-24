export default function Layout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: "#121C2D",
        backgroundSize: "60px 60px",
        backgroundImage:
          "linear-gradient(to right, grey 1px, transparent 1px), linear-gradient(to bottom, grey 1px, transparent 1px)",
      }}
      className="vh-full h-full"
    >
      <div className="h-[500px] w-[500px] rounded-full bg-[#F22F46] absolute top-[-350px] left-[calc(50%-250px)] flex flex-col items-center justify-center">
        <img src="/images/twilio_devs.png" alt="twilio devs" className="w-2/3 mt-[60%]" />
      </div>
      {children}
    </div>
  );
}
