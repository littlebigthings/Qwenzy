import bg from "../assets/bg.png"

export function BackgroundPattern() {
  return (
    <div 
      className="fixed inset-0 bg-repeat opacity-5 pointer-events-none"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: '800px',
        zIndex: 0
      }}
    />
  )
}
