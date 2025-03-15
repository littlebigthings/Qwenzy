import bg from "../assets/bg.png"

export function BackgroundPattern() {
  return (
    <div 
      className="fixed inset-0 bg-repeat pointer-events-none"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: '800px',
        backgroundPosition: 'center',
        zIndex: 0
      }}
    />
  )
}