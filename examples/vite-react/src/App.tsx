import './App.css'
import 'dockbar'

function App() {
  return (
    <dock-wrapper id="dock">
      {Array.from({ length: 10 }, (_, i) => i).map(i => (
        <dock-item key={i}>
          <div className="item">
            {i}
          </div>
        </dock-item>
      ))}
    </dock-wrapper>
  )
}

export default App
