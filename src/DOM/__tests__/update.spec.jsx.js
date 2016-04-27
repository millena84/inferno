import { render } from './../rendering';
import { createBlueprint } from './../../core/createBlueprint';
import Component from './../../component/index';

const Inferno = {
    createBlueprint
};

describe('Stateful Component updates', () => {

    let container;

    beforeEach(() => {
        container = document.createElement('div');
    });

    afterEach(() => {
        container.innerHTML = '';
    });

    it('Should forget old updates', (done) => {
        let updatesAfromOutside;

        class A extends Component {
            constructor(props) {
                super(props);

                this.state = {
                    stuff: true
                };

                updatesAfromOutside = this.updateMe.bind(this);
            }

            updateMe() {
                this.setState({
                    stuff: false
                })
            }

            render() {
                return <div>A Component A</div>;
            }
        }

        class B extends Component {
            constructor(props) {
                super(props);
            }

            render() {
                return <div>B Component B</div>;
            }
        }

        // Render A
        var spy = sinon.spy(A.prototype, 'componentWillUnmount');
        render(<A />, container);
        expect(container.innerHTML).to.equal('<div>A Component A</div>');
        // Render B
        render(<B />, container);
        expect(container.innerHTML).to.equal('<div>B Component B</div>');
        sinon.assert.calledOnce(spy); // componentUnMount should have been called
	    spy.restore();

        // delayed update triggers for A
        expect(() => updatesAfromOutside()).to.throw();
        expect(container.innerHTML).to.equal('<div>B Component B</div>');

        done();
    });

    it('Should give better error message when calling setState from constructor ??', () => {

        // Following test simulates situation that setState is called when mounting process has not finished, fe. in constructor

        class Parent extends Component {
            constructor(props) {
                super(props);

                this.state = {
                    show: false
                };

                this.domagic = this.domagic.bind(this);

                // Call setState
	            expect(() => this.setState({
		            show: true
	            })).to.throw;
            }

            domagic() {
                this.setState({
                    show: !this.state.show
                });
            }

            render() {
                return (
                    <div>
                        <button onclick={this.domagic} />
                        <Child show={this.state.show} />
                    </div>
                );
            }
        }


        class Child extends Component {
            constructor(props) {
                super(props);
            }

            render() {
                return (
                    <div>
                        {this.props.show ? <span class="hr red"><span class="hr-text">Late</span></span> : null}
                        <p>More content</p>
                    </div>
                )
            }
        }

        render(<Parent />, container);
    });

    it('Should update boolean properties when children change same time', () => {
        let updateCaller = null;

        class A extends Component {
            constructor(props) {
                super(props);

                this.state = {
                    values: [
                        {checked: false},
                        {checked: false},
                        {checked: false}
                    ]
                };

                this.updateCaller = this.updateCaller.bind(this);
                updateCaller = this.updateCaller;
            }

            updateCaller() {
               this.setState({
                   values: [
                       {checked: false},
                       {checked: false}
                   ]
               });
            }

            render() {
               return (
                   <div>
                       {this.state.values.map(function(value) {
                           return <input type="checkbox" checked={value.checked} />
                       })}
                   </div>
               )
            }
        }

        render(<A />, container);
        expect(container.innerHTML).to.equal('<div><input type="checkbox"><input type="checkbox"><input type="checkbox"></div>');
        let firstChild = container.firstChild;
        expect(firstChild.childNodes[0].checked).to.equal(false);
        expect(firstChild.childNodes[1].checked).to.equal(false);
        expect(firstChild.childNodes[2].checked).to.equal(false);

        const checkbox = container.querySelector('input');
        checkbox.checked = true; // SIMULATE user selecting checkbox
        expect(firstChild.childNodes[0].checked).to.equal(true, 'USER SHOULD BE ABLE TO TICK CHECKBOX');

        updateCaller(); // New render
        expect(container.innerHTML).to.equal('<div><input type="checkbox"><input type="checkbox"></div>');
        expect(firstChild.childNodes[0].checked).to.equal(false, 'AFTER NEW RENDER IT SHOULD RENDER INPUT AS UNCHECKED');
        expect(firstChild.childNodes[1].checked).to.equal(false);

    });

    it('Should Not get stuck in UNMOUNTED state', () => {
        let updateCaller = null;

        // This parent is used for setting up Test scenario, not much related
        class Parent extends Component {
            constructor(props) {
                super(props);
            }
            render() {
                return (
                    <div>
                        <A></A>
                    </div>
                )
            }
        }

        // A component holds all the stuff together
        class A extends Component {
            constructor(props) {
                super(props);

                this.state = {
                    obj: {
                        test: true
                    }
                };

                this.updateCaller = this.updateCaller.bind(this);
                updateCaller = this.updateCaller;
            }

            updateCaller() {
                this.setState({
                    obj: {
                        test: !this.state.obj.test
                    }
                });
            }

            render() {
                return (
                    <div>
                        <B data={this.state.obj}></B>
                    </div>
                )
            }
        }
        // B has direct child C, B Is simple wrapper component
        class B extends Component {
            constructor(props) {
                super(props);
            }
            render() {
                return (
                    <C data={this.props.data}></C>
                )
            }
        }

        let StuckChild = null;

        // C is real component which does the job
        // C is the one that gets unmounted...
        class C extends Component {
            constructor(props) {
                super(props);

                this.state = {
                    b: false
                };

                this.imstuck = this.imstuck.bind(this);
                StuckChild = this.imstuck;
            }

            imstuck() {
                this.setState({
                    b: !this.state.b
                });
            }

            render() {
                return (
                    <div>
                        {this.props.data.test+''}
                        {this.state.b +''}
                    </div>
                )
            }
        }

        render(<Parent />, container);

        expect(container.innerHTML).to.equal('<div><div><div>truefalse</div></div></div>');

        updateCaller();
        expect(container.innerHTML).to.equal('<div><div><div>falsefalse</div></div></div>');
        updateCaller();
	    expect(container.innerHTML).to.equal('<div><div><div>truefalse</div></div></div>');
        updateCaller();
        expect(container.innerHTML).to.equal('<div><div><div>falsefalse</div></div></div>');
        StuckChild();
        expect(container.innerHTML).to.equal('<div><div><div>falsetrue</div></div></div>');
        StuckChild();
        expect(container.innerHTML).to.equal('<div><div><div>falsefalse</div></div></div>');
        StuckChild();
        expect(container.innerHTML).to.equal('<div><div><div>falsetrue</div></div></div>');
    })
});