context('Playground', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('renders the dock and applies configuration changes', () => {
    cy.contains('h1', 'Dockbar')
      .should('be.visible')
    cy.get('dock-wrapper')
      .should('be.visible')
    cy.get('dock-item')
      .its('length')
      .should('be.greaterThan', 0)

    cy.contains('.tp-lblv_l', 'size')
      .parents('.tp-lblv')
      .find('input')
      .as('sizeInput')

    cy.get('@sizeInput')
      .clear()
    cy.get('@sizeInput')
      .type('72{enter}')

    cy.get('dock-item')
      .first()
      .should('have.attr', 'size', '72')
  })
})
