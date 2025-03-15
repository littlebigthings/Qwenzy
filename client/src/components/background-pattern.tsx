import bg from "../assets/bg.png"

export function BackgroundPattern() {
  return (
    <div 
      className="fixed pointer-events-none"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: '100%',
        backgroundPosition: 'center',
        zIndex: 0
      }}
    />
  )
}